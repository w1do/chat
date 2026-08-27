<?php

declare(strict_types=1);

namespace Vendor\SharedKernel\Contracts;

use DateTimeInterface;

/**
 * Присутствие действующего лица: «в сети» и момент последней активности.
 * Отдельный контракт, а не часть Actor: пакету, которому присутствие не
 * нужно, знать о нём незачем — он проверяет instanceof и обходится без.
 */
interface Present
{
    public function isOnline(): bool;

    public function lastSeenAt(): ?DateTimeInterface;
}
