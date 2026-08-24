<?php

declare(strict_types=1);

namespace Vendor\Administration\Domain\Enums;

/**
 * Права пакета в формате `<service>.<resource>.<action>` (CLAUDE.md §«Права»).
 * Источник прав — приложение: пакет только объявляет, что проверять.
 */
enum Ability: string
{
    case ViewSystem = 'administration.system.view';
    case UpdateSettings = 'administration.settings.update';
    case ViewAudit = 'administration.audit.view';

    /** @return list<string> */
    public static function all(): array
    {
        return array_map(static fn (self $ability): string => $ability->value, self::cases());
    }
}
