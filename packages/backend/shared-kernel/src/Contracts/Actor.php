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

    /**
     * Адрес аватарки в мелком размере — для списков и лент; null, когда
     * аватарки нет и рисуется буква имени. Пакеты берут её тем же путём,
     * что и имя: через контракт, не зная класс пользователя.
     */
    public function avatarUrl(): ?string;
}
