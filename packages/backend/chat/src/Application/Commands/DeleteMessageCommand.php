<?php

declare(strict_types=1);

namespace Vendor\Chat\Application\Commands;

final readonly class DeleteMessageCommand
{
    public function __construct(public string $messageId) {}
}
