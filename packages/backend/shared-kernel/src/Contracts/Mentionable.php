<?php

declare(strict_types=1);

namespace Vendor\SharedKernel\Contracts;

/**
 * Действующее лицо, которое можно упомянуть в тексте: `@handle`. Отдельный
 * контракт — пакету чата нужен только сам ник, а не класс пользователя (§4.1).
 */
interface Mentionable
{
    /** Ник для упоминания без «собачки»; null — упоминать человека нечем. */
    public function mentionHandle(): ?string;
}
