<?php

declare(strict_types=1);

namespace Vendor\Administration\Domain\Contracts;

/**
 * Состояние зависимостей глазами приложения: пакет не знает ни про Horizon,
 * ни про Reverb, ни про Typesense — их проверяет composition root.
 */
interface SystemProbe
{
    /** @return array<string, array{status: string, detail?: string}> */
    public function components(): array;
}
