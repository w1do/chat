<?php

declare(strict_types=1);

namespace Vendor\Chat\Application\Handlers\Commands;

use Illuminate\Contracts\Cache\Repository as Cache;
use Illuminate\Contracts\Events\Dispatcher;
use Illuminate\Database\ConnectionResolverInterface;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;
use InvalidArgumentException;
use Spatie\MediaLibrary\MediaCollections\Models\Media;
use Vendor\Chat\Application\Commands\SendMessageCommand;
use Vendor\Chat\Application\DTOs\MessageData;
use Vendor\Chat\Application\Support\PendingAttachments;
use Vendor\Chat\Domain\Contracts\MessageSanitizer;
use Vendor\Chat\Domain\Enums\MessageKind;
use Vendor\Chat\Domain\Events\MessageCreated;
use Vendor\Chat\Domain\Models\Message;
use Vendor\Chat\Domain\ValueObjects\MentionList;
use Vendor\Chat\Domain\ValueObjects\MessageBody;

final readonly class SendMessageHandler
{
    private const IDEMPOTENCY_TTL_SECONDS = 86400;

    public function __construct(
        private ConnectionResolverInterface $db,
        private MessageSanitizer $sanitizer,
        private Cache $cache,
        private Dispatcher $events,
    ) {}

    /** @return array{message: MessageData, replayed: bool} */
    public function handle(SendMessageCommand $command): array
    {
        // Идемпотентность сетевых повторов: ключ на пользователя.
        $cacheKey = $command->idempotencyKey !== null
            ? "chat:send:{$command->authorId}:{$command->idempotencyKey}"
            : null;

        if ($cacheKey !== null && ($existingId = $this->cache->get($cacheKey)) !== null) {
            /** @var Message $existing */
            $existing = Message::query()->findOrFail($existingId);

            return ['message' => MessageData::fromModel($existing), 'replayed' => true];
        }

        $body = $this->sanitizeBody($command->body);

        // Сообщение полно, когда есть текст или вложение (spec
        // chat/rooms-and-messages); форма без того и другого — некорректна.
        if ($body === null && $command->attachments === []) {
            throw ValidationException::withMessages([
                'body' => ['Message must have text or an attachment.'],
            ]);
        }

        $mentions = MentionList::fromUserIds($command->mentions);

        $message = $this->db->connection()->transaction(function () use ($command, $body, $mentions): Message {
            if ($command->replyToId !== null) {
                $parentInRoom = Message::query()
                    ->where('room_id', $command->roomId)
                    ->whereKey($command->replyToId)
                    ->exists();

                if (! $parentInRoom) {
                    throw ValidationException::withMessages([
                        'reply_to_id' => ['Reply target must belong to the same room.'],
                    ]);
                }
            }

            // Вложения захватываются под блокировкой: два конкурентных
            // повтора отправки не разделят один файл между сообщениями.
            $claimed = $this->claimableAttachments($command);

            $message = Message::query()->create([
                'room_id' => $command->roomId,
                'kind' => MessageKind::Text,
                'author_id' => $command->authorId,
                'reply_to_id' => $command->replyToId,
                'body' => $body->value ?? '',
                'mentions' => $mentions->isEmpty() ? null : $mentions->userIds,
            ]);

            // Файл уже в хранилище; меняется только владелец записи медиа —
            // с комнаты на сообщение. Путь файла от владельца не зависит.
            // Порядок вложений — порядок списка в запросе: параллельные
            // загрузки не должны перемешивать плитки.
            foreach ($claimed->values() as $position => $media) {
                $media->update([
                    'model_type' => $message->getMorphClass(),
                    'model_id' => $message->id,
                    'order_column' => $position + 1,
                ]);
            }

            return $message;
        });

        if ($cacheKey !== null) {
            $this->cache->put($cacheKey, $message->id, self::IDEMPOTENCY_TTL_SECONDS);
        }

        // Побочные эффекты — после commit (транзакция выше уже завершена).
        $this->events->dispatch(new MessageCreated($message->room_id, $message->id));

        return ['message' => MessageData::fromModel($message), 'replayed' => false];
    }

    private function sanitizeBody(string $raw): ?MessageBody
    {
        try {
            return $this->sanitizer->sanitizeOptional($raw);
        } catch (InvalidArgumentException $exception) {
            throw ValidationException::withMessages(['body' => [$exception->getMessage()]]);
        }
    }

    /**
     * Вложения, которые это сообщение вправе забрать: загружены в эту же
     * комнату этим же автором и ещё не принадлежат сообщению. Чужое или
     * несуществующее — ошибка целиком, без частичной отправки.
     *
     * @return Collection<int, Media>
     */
    private function claimableAttachments(SendMessageCommand $command): Collection
    {
        if ($command->attachments === []) {
            return new Collection;
        }

        $claimed = PendingAttachments::query($command->roomId)
            ->whereIn('uuid', $command->attachments)
            ->lockForUpdate()
            ->get()
            ->keyBy(fn (Media $media): string => (string) $media->uuid);

        $missing = array_diff($command->attachments, $claimed->keys()->all());

        $foreign = $claimed->first(
            fn (Media $media): bool => (string) $media->getCustomProperty('uploader_id') !== $command->authorId,
        );

        if ($missing !== [] || $foreign !== null) {
            throw ValidationException::withMessages([
                'attachments' => ['Attachment not found or not yours.'],
            ]);
        }

        // В порядке запроса — как человек их приложил.
        return new Collection(array_map(
            fn (string $uuid): Media => $claimed[$uuid],
            $command->attachments,
        ));
    }
}
