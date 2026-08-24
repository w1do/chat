<?php

declare(strict_types=1);

namespace Vendor\Ai\Domain\Enums;

enum Tone: string
{
    case Friendly = 'friendly';
    case Neutral = 'neutral';
    case Formal = 'formal';
    case Softer = 'softer';

    public function label(): string
    {
        return match ($this) {
            self::Friendly => 'дружелюбный',
            self::Neutral => 'нейтральный',
            self::Formal => 'формальный',
            self::Softer => 'мягкий, без резкости',
        };
    }
}
