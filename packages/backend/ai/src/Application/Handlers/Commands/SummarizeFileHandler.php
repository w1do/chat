<?php

declare(strict_types=1);

namespace Vendor\Ai\Application\Handlers\Commands;

use Illuminate\Contracts\Bus\Dispatcher as Bus;
use Illuminate\Contracts\Config\Repository;
use Illuminate\Database\UniqueConstraintViolationException;
use InvalidArgumentException;
use Vendor\Ai\Application\AiUnavailable;
use Vendor\Ai\Application\Commands\SummarizeFileCommand;
use Vendor\Ai\Application\DTOs\FileSummaryData;
use Vendor\Ai\Domain\Contracts\FileSummaryProvider;
use Vendor\Ai\Domain\Contracts\SummarySource;
use Vendor\Ai\Domain\Contracts\SummaryTargetDenied;
use Vendor\Ai\Domain\Contracts\SummaryTargetUnsupported;
use Vendor\Ai\Domain\Enums\FileSummaryStatus;
use Vendor\Ai\Domain\Enums\SummaryOperation;
use Vendor\Ai\Domain\Models\AiFileSummary;
use Vendor\Ai\Domain\ValueObjects\SummaryFileRules;
use Vendor\Ai\Domain\ValueObjects\SummaryTarget;
use Vendor\Ai\Infrastructure\Jobs\SummarizeFileJob;
use Vendor\Ai\Infrastructure\Quota\QuotaExceeded;
use Vendor\Ai\Infrastructure\Quota\SummaryQuota;
use Vendor\Ai\Infrastructure\Quota\UsageRecorder;

/**
 * Приём запроса на пересказ: проверки, запись операции и постановка задания.
 * Сам поставщик здесь не вызывается — документ обрабатывается в очереди
 * (design 4), поэтому HTTP-ответ не ждёт внешнего сервиса.
 */
final readonly class SummarizeFileHandler
{
    public function __construct(
        private SummarySource $source,
        private SummaryQuota $quota,
        private UsageRecorder $recorder,
        private FileSummaryProvider $provider,
        private Repository $config,
        private Bus $bus,
    ) {}

    /**
     * @return array{summary: FileSummaryData, replayed: bool}
     *
     * @throws AiUnavailable когда помощник выключен администратором
     * @throws InvalidArgumentException когда в черновике нет токена-триггера
     * @throws QuotaExceeded когда исчерпана квота пользователя или установки
     * @throws SummaryTargetDenied когда сообщение недоступно
     * @throws SummaryTargetUnsupported когда подходящего документа нет
     */
    public function handle(SummarizeFileCommand $command): array
    {
        if (! $this->config->get('ai.enabled', false)) {
            throw new AiUnavailable;
        }

        $settings = (array) $this->config->get('ai.file_summary', []);
        $trigger = (string) ($settings['trigger'] ?? '@ai');

        if (! self::mentionsTrigger($command->body, $trigger)) {
            throw new InvalidArgumentException("Reply must mention {$trigger} to request a summary.");
        }

        // Повтор с тем же ключом — та же операция: второго задания нет.
        $existing = $this->existing($command);

        if ($existing !== null) {
            return ['summary' => FileSummaryData::fromModel($existing), 'replayed' => true];
        }

        // Квота проверяется до обращения к переписке и до постановки задания.
        $this->quota->assertWithinQuota($command->userId);

        $target = $this->source->locate($command->userId, $command->messageId);
        $this->assertSupported($target, $settings);

        $this->quota->record($command->userId);

        // Обращение попадает в общий журнал сразу: расход дописывает задание.
        $request = $this->recorder->start(
            userId: $command->userId,
            operation: SummaryOperation::SummarizeFile->value,
            provider: $this->provider->name(),
        );

        try {
            $summary = AiFileSummary::query()->create([
                'user_id' => $command->userId,
                'ai_request_id' => $request->id,
                'room_id' => $target->roomId,
                'message_id' => $target->messageId,
                'attachment_id' => $target->attachmentId,
                'file_name' => $target->fileName,
                'mime_type' => $target->mimeType,
                'file_size' => $target->size,
                'idempotency_key' => $command->idempotencyKey,
                'locale' => $this->locale($command, $target->roomId, $settings),
                'status' => FileSummaryStatus::Pending,
                'provider' => $this->provider->name(),
            ]);
        } catch (UniqueConstraintViolationException $exception) {
            // Два одновременных запроса с одним ключом: операцию завела
            // соседняя попытка — отдаём её, а не поднимаем ошибку.
            $concurrent = $this->existing($command);

            if ($concurrent === null) {
                throw $exception;
            }

            return ['summary' => FileSummaryData::fromModel($concurrent), 'replayed' => true];
        }

        $this->bus->dispatch(new SummarizeFileJob($summary->id));

        return ['summary' => FileSummaryData::fromModel($summary), 'replayed' => false];
    }

    /** @param array<string, mixed> $settings */
    private function assertSupported(SummaryTarget $target, array $settings): void
    {
        $reason = SummaryFileRules::fromConfig($settings)->rejectionReason($target);

        if ($reason !== null) {
            throw new SummaryTargetUnsupported($reason);
        }
    }

    private function existing(SummarizeFileCommand $command): ?AiFileSummary
    {
        if ($command->idempotencyKey === null) {
            return null;
        }

        return AiFileSummary::query()
            ->where('user_id', $command->userId)
            ->where('message_id', $command->messageId)
            ->where('idempotency_key', $command->idempotencyKey)
            ->first();
    }

    /**
     * Язык пересказа: просьба клиента, затем язык переписки, затем язык
     * установки. Неподдерживаемый заменяется английским (spec: fallback).
     *
     * @param  array<string, mixed>  $settings
     */
    private function locale(SummarizeFileCommand $command, string $roomId, array $settings): string
    {
        /** @var list<string> $supported */
        $supported = (array) ($settings['locales'] ?? ['en']);
        $fallback = (string) ($settings['fallback_locale'] ?? 'en');

        foreach ([$command->locale, $this->source->localeFor($roomId), $this->config->get('app.locale')] as $candidate) {
            if (! is_string($candidate) || $candidate === '') {
                continue;
            }

            $normalized = mb_strtolower(explode('_', str_replace('-', '_', $candidate))[0]);

            if (in_array($normalized, $supported, true)) {
                return $normalized;
            }
        }

        return $fallback;
    }

    /** Токен-триггер отдельным словом: «@aids» помощника не зовёт. */
    private static function mentionsTrigger(string $body, string $trigger): bool
    {
        $pattern = '/(?<![\p{L}\p{N}])'.preg_quote($trigger, '/').'(?![\p{L}\p{N}])/iu';

        return preg_match($pattern, $body) === 1;
    }
}
