<?php

declare(strict_types=1);

namespace Vendor\Ai\Application\Commands;

final readonly class SummarizeFileCommand
{
    public function __construct(
        public string $userId,
        /** Сообщение, к которому приложен документ. */
        public string $messageId,
        /** Черновик ответа: в нём должен быть токен-триггер. */
        public string $body,
        public ?string $idempotencyKey = null,
        public ?string $locale = null,
    ) {}
}
