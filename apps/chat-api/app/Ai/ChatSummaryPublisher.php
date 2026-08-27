<?php

declare(strict_types=1);

namespace App\Ai;

use Illuminate\Contracts\Auth\Access\Gate;
use Illuminate\Contracts\Config\Repository;
use Illuminate\Validation\ValidationException;
use Vendor\Ai\Domain\Contracts\SummaryPublisher;
use Vendor\Ai\Domain\Contracts\SummaryPublishFailed;
use Vendor\Chat\Application\Commands\SendMessageCommand;
use Vendor\Chat\Application\Handlers\Commands\SendMessageHandler;
use Vendor\Chat\Domain\Models\Message;
use Vendor\Chat\Domain\Models\Room;

/**
 * Публикация пересказа обычной отправкой сообщения: авторство остаётся у
 * человека, а комната получает те же события, что и от любой реплики
 * (design 1). Права проверяются заново — между черновиком и подтверждением
 * человека могли исключить из комнаты.
 */
final readonly class ChatSummaryPublisher implements SummaryPublisher
{
    public function __construct(
        private SendMessageHandler $handler,
        private Gate $gate,
        private Repository $config,
    ) {}

    public function publish(string $roomId, string $authorId, string $body, ?string $replyToId): string
    {
        $model = $this->config->get('auth.providers.users.model');
        $user = $model::query()->whereKey($authorId)->first();
        $room = Room::query()->whereKey($roomId)->first();

        if ($user === null || $room === null || $this->gate->forUser($user)->denies('send', [Message::class, $room])) {
            throw new SummaryPublishFailed('Room no longer accepts messages from this user.');
        }

        try {
            $result = $this->handler->handle(new SendMessageCommand(
                roomId: $roomId,
                authorId: $authorId,
                body: $body,
                replyToId: $replyToId,
            ));
        } catch (ValidationException $exception) {
            throw new SummaryPublishFailed($exception->getMessage());
        }

        return $result['message']->id;
    }
}
