<?php

declare(strict_types=1);

namespace Vendor\Notifications\Application\Handlers\Commands;

use Illuminate\Validation\ValidationException;
use Vendor\Notifications\Application\Commands\UpdatePreferencesCommand;
use Vendor\Notifications\Domain\Enums\Category;
use Vendor\Notifications\Domain\Enums\Channel;
use Vendor\Notifications\Domain\Models\NotificationPreference;

final readonly class UpdatePreferencesHandler
{
    public function handle(UpdatePreferencesCommand $command): void
    {
        foreach ($command->preferences as $preference) {
            $category = Category::from($preference['category']);
            $channel = Channel::from($preference['channel']);

            // Обязательные уведомления нельзя отключить в ленте (spec).
            if ($category->isMandatory() && $channel === Channel::Database && $preference['enabled'] === false) {
                throw ValidationException::withMessages([
                    'preferences' => ['Уведомления безопасности в ленте отключить нельзя.'],
                ]);
            }

            NotificationPreference::query()->updateOrCreate(
                ['user_id' => $command->userId, 'category' => $category->value, 'channel' => $channel->value],
                ['enabled' => $preference['enabled']],
            );
        }
    }
}
