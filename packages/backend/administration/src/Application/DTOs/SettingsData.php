<?php

declare(strict_types=1);

namespace Vendor\Administration\Application\DTOs;

final readonly class SettingsData
{
    public function __construct(public bool $aiEnabled) {}
}
