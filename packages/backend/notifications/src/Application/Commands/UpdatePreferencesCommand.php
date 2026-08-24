<?php

declare(strict_types=1);

namespace Vendor\Notifications\Application\Commands;

final readonly class UpdatePreferencesCommand
{
    /** @param list<array{category: string, channel: string, enabled: bool}> $preferences */
    public function __construct(
        public string $userId,
        public array $preferences,
    ) {}
}
