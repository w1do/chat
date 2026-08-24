<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Throwable;
use Vendor\Administration\Domain\Enums\Setting;
use Vendor\Administration\Infrastructure\Persistence\SettingsStore;

/**
 * Выключатели администратора применяются на каждый запрос: конфигурацию
 * Octane восстанавливает между запросами, поэтому значение не «залипает»
 * в worker'е (CLAUDE.md, Octane safety).
 */
final readonly class ApplyRuntimeSettings
{
    public function __construct(private SettingsStore $settings) {}

    public function handle(Request $request, Closure $next): Response
    {
        try {
            $aiEnabled = $this->settings->get(Setting::AiEnabled);
        } catch (Throwable) {
            // Недоступное хранилище настроек не должно ронять API: остаётся
            // значение из конфигурации.
            return $next($request);
        }

        if ($aiEnabled !== null) {
            config(['ai.enabled' => (bool) $aiEnabled]);
        }

        return $next($request);
    }
}
