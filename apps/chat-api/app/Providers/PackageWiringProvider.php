<?php

declare(strict_types=1);

namespace App\Providers;

use Illuminate\Support\ServiceProvider;

/**
 * Единственная точка связывания пакетов (STRUCTURE.md §2):
 * cross-package listeners chat → notifications, chat → audit
 * регистрируются здесь, а не внутри пакетов.
 */
final class PackageWiringProvider extends ServiceProvider
{
    public function boot(): void
    {
        // Связки появляются на этапах 8 (notifications) и 11 (audit).
    }
}
