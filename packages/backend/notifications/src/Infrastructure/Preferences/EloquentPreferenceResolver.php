<?php

declare(strict_types=1);

namespace Vendor\Notifications\Infrastructure\Preferences;

use Illuminate\Contracts\Config\Repository;
use Vendor\Notifications\Domain\Contracts\PreferenceResolver;
use Vendor\Notifications\Domain\Enums\Category;
use Vendor\Notifications\Domain\Enums\Channel;
use Vendor\Notifications\Domain\Models\NotificationPreference;

/** Настройки пользователя поверх значений по умолчанию из конфигурации. */
final readonly class EloquentPreferenceResolver implements PreferenceResolver
{
    public function __construct(private Repository $config) {}

    /** @return list<Channel> */
    public function channelsFor(string $userId, Category $category): array
    {
        return array_values(array_filter(
            Channel::cases(),
            fn (Channel $channel): bool => $this->isEnabled($userId, $category, $channel),
        ));
    }

    public function isEnabled(string $userId, Category $category, Channel $channel): bool
    {
        // Лента обязательных категорий не отключается (spec: mandatory notifications).
        if ($category->isMandatory() && $channel === Channel::Database) {
            return true;
        }

        $stored = NotificationPreference::query()
            ->where('user_id', $userId)
            ->where('category', $category->value)
            ->where('channel', $channel->value)
            ->value('enabled');

        if ($stored !== null) {
            return (bool) $stored;
        }

        return (bool) $this->config->get("notifications.defaults.{$category->value}.{$channel->value}", false);
    }
}
