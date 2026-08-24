<?php

declare(strict_types=1);

namespace Vendor\Chat\Application\Queries;

final readonly class GetMessageQuery
{
    public function __construct(public string $messageId) {}
}
