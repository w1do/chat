<?php

declare(strict_types=1);

namespace Vendor\Administration\Infrastructure\Persistence;

use Illuminate\Contracts\Cache\Repository as Cache;
use Illuminate\Support\Carbon;
use Vendor\Administration\Domain\Enums\Setting;
use Vendor\Administration\Domain\Models\SystemSetting;

/**
 * Хранилище настроек с кэшем: значение читается на каждый запрос, поэтому
 * держим его в Laravel Cache, а не в памяти worker'а (CLAUDE.md, Octane safety).
 */
final readonly class SettingsStore
{
    private const CACHE_KEY = 'administration:settings';

    public function __construct(
        private Cache $cache,
        private int $ttlSeconds = 60,
    ) {}

    public function get(Setting $setting, mixed $default = null): mixed
    {
        return $this->all()[$setting->value] ?? $default;
    }

    /** @return array<string, mixed> */
    public function all(): array
    {
        return $this->cache->remember(
            self::CACHE_KEY,
            $this->ttlSeconds,
            static fn (): array => SystemSetting::query()->pluck('value', 'key')->all(),
        );
    }

    public function put(Setting $setting, mixed $value, ?string $actorId = null): void
    {
        SystemSetting::query()->updateOrCreate(
            ['key' => $setting->value],
            ['value' => $value, 'updated_by' => $actorId, 'updated_at' => Carbon::now()],
        );

        $this->cache->forget(self::CACHE_KEY);
    }
}
