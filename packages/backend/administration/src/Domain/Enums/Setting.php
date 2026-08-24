<?php

declare(strict_types=1);

namespace Vendor\Administration\Domain\Enums;

/** Настройки, которыми администратор управляет во время работы. */
enum Setting: string
{
    case AiEnabled = 'ai.enabled';

    public function label(): string
    {
        return match ($this) {
            self::AiEnabled => 'AI-помощник',
        };
    }
}
