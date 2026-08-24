<?php

declare(strict_types=1);

namespace Vendor\SharedKernel\Contracts;

/**
 * Действующее лицо (пользователь) для пакетов, которым нельзя знать
 * конкретный App\Models\User (§4.1 инструкции).
 */
interface Actor extends Identifiable
{
    public function displayName(): string;
}
