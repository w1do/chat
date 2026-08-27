<?php

declare(strict_types=1);

namespace App\Ai;

use Illuminate\Contracts\Auth\Access\Gate;
use Illuminate\Contracts\Config\Repository;
use Spatie\MediaLibrary\MediaCollections\Models\Media;
use Vendor\Ai\Domain\Contracts\SummarySource;
use Vendor\Ai\Domain\Contracts\SummaryTargetDenied;
use Vendor\Ai\Domain\Contracts\SummaryTargetUnsupported;
use Vendor\Ai\Domain\Contracts\UnreadableDocument;
use Vendor\Ai\Domain\ValueObjects\SummaryTarget;
use Vendor\Chat\Domain\Models\Message;

/**
 * Связка ai → chat: пакет пересказа знает только контракт, а переписку и
 * права по ней читает приложение-композиция (STRUCTURE.md §2).
 */
final readonly class ChatSummarySource implements SummarySource
{
    /** Сколько последних реплик смотрим, определяя язык переписки. */
    private const LOCALE_SAMPLE = 20;

    public function __construct(private Gate $gate, private Repository $config) {}

    public function locate(string $userId, string $messageId): SummaryTarget
    {
        $model = $this->config->get('auth.providers.users.model');
        $user = $model::query()->whereKey($userId)->first();

        /** @var ?Message $message */
        $message = Message::query()->with('room')->whereKey($messageId)->first();

        // Мягко удалённое сообщение find() не вернёт — его файлов уже нет.
        if ($user === null || $message === null) {
            throw SummaryTargetDenied::hidden();
        }

        $verdict = $this->gate->forUser($user)->inspect('view', $message);

        if ($verdict->denied()) {
            // Чужого диалога для постороннего не существует (MessagePolicy).
            throw $verdict->status() === 404 ? SummaryTargetDenied::hidden() : new SummaryTargetDenied;
        }

        $attachments = $message->attachments();

        // Пересказываем ровно один документ: у пачки файлов нет одного смысла.
        if ($attachments->count() !== 1) {
            throw new SummaryTargetUnsupported($attachments->isEmpty()
                ? 'К этому сообщению не приложен документ.'
                : 'Пересказать можно сообщение ровно с одним документом.');
        }

        /** @var Media $media */
        $media = $attachments->first();

        return new SummaryTarget(
            roomId: $message->room_id,
            messageId: $message->id,
            attachmentId: (string) $media->uuid,
            fileName: $media->file_name,
            mimeType: (string) $media->mime_type,
            size: (int) $media->size,
        );
    }

    public function read(string $attachmentId): string
    {
        $media = Media::query()
            ->where('uuid', $attachmentId)
            ->where('collection_name', Message::ATTACHMENTS)
            ->first();

        if ($media === null) {
            throw new UnreadableDocument('Attachment is no longer stored.');
        }

        $stream = $media->stream();
        $contents = stream_get_contents($stream);

        if (is_resource($stream)) {
            fclose($stream);
        }

        return $contents === false ? throw new UnreadableDocument('Attachment cannot be read.') : $contents;
    }

    /**
     * Язык переписки по её последним репликам: у комнаты нет своей настройки
     * языка, а пересказ обязан звучать так же, как разговор вокруг него.
     * Не распознали — null, и пакет возьмёт язык установки.
     */
    public function localeFor(string $roomId): ?string
    {
        $sample = Message::query()
            ->where('room_id', $roomId)
            ->whereNotNull('body')
            ->orderByDesc('created_at')
            ->limit(self::LOCALE_SAMPLE)
            ->pluck('body')
            ->implode(' ');

        $cyrillic = preg_match_all('/\p{Cyrillic}/u', $sample);
        $latin = preg_match_all('/[A-Za-z]/u', $sample);

        if ($cyrillic === 0 && $latin === 0) {
            return null;
        }

        return $cyrillic >= $latin ? 'ru' : 'en';
    }
}
