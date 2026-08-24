<?php

declare(strict_types=1);

namespace Vendor\Administration\Application\Handlers\Queries;

use Vendor\Administration\Domain\Contracts\SystemProbe;
use Vendor\Administration\Domain\Enums\Setting;
use Vendor\Administration\Infrastructure\Persistence\SettingsStore;

final readonly class GetSystemStatusHandler
{
    public function __construct(
        private SystemProbe $probe,
        private SettingsStore $settings,
    ) {}

    /** @return array{components: array<string, array{status: string, detail?: string}>, features: array<string, bool>, version: string} */
    public function handle(): array
    {
        return [
            'components' => $this->probe->components(),
            'features' => [
                'ai' => (bool) $this->settings->get(Setting::AiEnabled, config('ai.enabled', false)),
                'search' => (bool) config('chat.search.enabled', false),
            ],
            'version' => (string) config('administration.version', '0.1.0'),
        ];
    }
}
