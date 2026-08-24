<?php

declare(strict_types=1);

namespace Vendor\Chat\Application\Handlers\Commands;

use Illuminate\Contracts\Cache\Repository as Cache;
use Illuminate\Contracts\Events\Dispatcher;
use Illuminate\Database\ConnectionResolverInterface;
use Illuminate\Validation\ValidationException;
use Vendor\Chat\Application\Commands\SendMessageCommand;
use Vendor\Chat\Application\DTOs\MessageData;
use Vendor\Chat\Domain\Contracts\MessageSanitizer;
use Vendor\Chat\Domain\Enums\MessageKind;
use Vendor\Chat\Domain\Events\MessageCreated;
use Vendor\Chat\Domain\Models\Message;
use Vendor\Chat\Domain\ValueObjects\MentionList;

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

        $body = $this->sanitizer->sanitize($command->body);
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

            $message = Message::query()->create([
                'room_id' => $command->roomId,
                'kind' => MessageKind::Text,
                'author_id' => $command->authorId,
                'reply_to_id' => $command->replyToId,
                'body' => $body->value,
                'mentions' => $mentions->isEmpty() ? null : $mentions->userIds,
            ]);

            return $message;
        });

        if ($cacheKey !== null) {
            $this->cache->put($cacheKey, $message->id, self::IDEMPOTENCY_TTL_SECONDS);
        }

        // Побочные эффекты — после commit (транзакция выше уже завершена).
        $this->events->dispatch(new MessageCreated($message->room_id, $message->id));

        return ['message' => MessageData::fromModel($message), 'replayed' => false];
    }
}
