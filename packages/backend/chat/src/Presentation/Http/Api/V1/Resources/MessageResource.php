<?php

declare(strict_types=1);

namespace Vendor\Chat\Presentation\Http\Api\V1\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Vendor\Chat\Application\DTOs\AttachmentData;
use Vendor\Chat\Application\DTOs\MessageData;
use Vendor\Chat\Application\DTOs\ReactionData;

/** @property MessageData $resource */
final class MessageResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->resource->id,
            'room_id' => $this->resource->roomId,
            'kind' => $this->resource->kind,
            'author_id' => $this->resource->authorId,
            'author_name' => $this->resource->authorName,
            'author_avatar_url' => $this->resource->authorAvatarUrl,
            'reply_to_id' => $this->resource->replyToId,
            'body' => $this->resource->body,
            'mentions' => $this->resource->mentions,
            'edited_at' => $this->resource->editedAt,
            'deleted' => $this->resource->deleted,
            'created_at' => $this->resource->createdAt,
            'reactions' => array_map(fn (ReactionData $reaction): array => [
                'emoji' => $reaction->emoji,
                'count' => $reaction->count,
                'reacted_by_me' => $reaction->reactedByMe,
            ], $this->resource->reactions),
            'payload' => $this->resource->payload,
            // У удалённого сообщения списка нет вовсе: его вложения не
            // перечисляются (spec contracts/api-and-realtime).
            'attachments' => $this->when(! $this->resource->deleted, fn (): array => array_map(
                fn (AttachmentData $attachment): array => $attachment->toArray(),
                $this->resource->attachments,
            )),
        ];
    }
}
