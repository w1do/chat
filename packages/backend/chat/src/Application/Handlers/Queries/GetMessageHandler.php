<?php

declare(strict_types=1);

namespace Vendor\Chat\Application\Handlers\Queries;

use Vendor\Chat\Application\DTOs\MessageData;
use Vendor\Chat\Application\Queries\GetMessageQuery;
use Vendor\Chat\Domain\Models\Message;

final readonly class GetMessageHandler
{
    public function handle(GetMessageQuery $query): MessageData
    {
        /** @var Message $message */
        $message = Message::query()->withTrashed()->findOrFail($query->messageId);

        return MessageData::fromModel($message);
    }
}
