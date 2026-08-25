<?php

declare(strict_types=1);

namespace Vendor\Identity\Application\Commands;

/** Снять текущую аватарку, не трогая набор: человек возвращается к букве. */
final readonly class ClearAvatarCommand
{
    public function __construct(public string $userId) {}
}
