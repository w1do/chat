<?php

declare(strict_types=1);

namespace Vendor\Ai\Domain\Enums;

/** Что делаем с черновиком; каждой операции соответствует системный промпт. */
enum RevisionOperation: string
{
    case Fix = 'fix';
    case Clarify = 'clarify';
    case Shorten = 'shorten';
    case Expand = 'expand';
    case Tone = 'tone';
    case Custom = 'custom';

    public function needsTone(): bool
    {
        return $this === self::Tone;
    }

    public function needsInstruction(): bool
    {
        return $this === self::Custom;
    }

    public function promptFile(): string
    {
        return $this->value.'.system.txt';
    }
}
