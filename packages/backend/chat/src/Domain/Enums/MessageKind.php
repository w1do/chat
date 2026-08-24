<?php

declare(strict_types=1);

namespace Vendor\Chat\Domain\Enums;

enum MessageKind: string
{
    case Text = 'text';
    case System = 'system';

    public function isSystem(): bool
    {
        return $this === self::System;
    }
}
