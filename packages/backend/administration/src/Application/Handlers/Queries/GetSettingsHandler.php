<?php

declare(strict_types=1);

namespace Vendor\Administration\Application\Handlers\Queries;

use Vendor\Administration\Application\DTOs\SettingsData;
use Vendor\Administration\Domain\Enums\Setting;
use Vendor\Administration\Infrastructure\Persistence\SettingsStore;

final readonly class GetSettingsHandler
{
    public function __construct(private SettingsStore $settings) {}

    public function handle(): SettingsData
    {
        return new SettingsData(
            aiEnabled: (bool) $this->settings->get(Setting::AiEnabled, config('ai.enabled', false)),
        );
    }
}
