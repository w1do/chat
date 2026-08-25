<?php

declare(strict_types=1);

namespace Vendor\Chat\Application\Commands;

final readonly class SendMessageCommand
{
    /**
     * @param  list<string>  $mentions
     * @param  list<string>  $attachments  идентификаторы загруженных вложений
     */
    public function __construct(
        public string $roomId,
        public string $authorId,
        public string $body,
        public ?string $replyToId = null,
        public array $mentions = [],
        public ?string $idempotencyKey = null,
        public array $attachments = [],
    ) {}
}
