<?php

declare(strict_types=1);

namespace Vendor\Administration\Application\Handlers\Commands;

use Vendor\Administration\Application\Commands\UpdateSettingsCommand;
use Vendor\Administration\Application\DTOs\SettingsData;
use Vendor\Administration\Domain\Contracts\AuditRecorder;
use Vendor\Administration\Domain\Enums\Setting;
use Vendor\Administration\Infrastructure\Persistence\SettingsStore;

final readonly class UpdateSettingsHandler
{
    public function __construct(
        private SettingsStore $settings,
        private AuditRecorder $audit,
    ) {}

    public function handle(UpdateSettingsCommand $command): SettingsData
    {
        if ($command->aiEnabled !== null) {
            $this->settings->put(Setting::AiEnabled, $command->aiEnabled, $command->actorId);

            // Изменение выключателя — security-sensitive действие (CLAUDE.md §7).
            $this->audit->record(
                action: 'administration.settings.updated',
                actorId: $command->actorId,
                actorLabel: $command->actorLabel,
                subjectType: 'setting',
                subjectId: Setting::AiEnabled->value,
                context: ['value' => $command->aiEnabled],
            );
        }

        return new SettingsData(aiEnabled: (bool) $this->settings->get(Setting::AiEnabled, config('ai.enabled', false)));
    }
}
