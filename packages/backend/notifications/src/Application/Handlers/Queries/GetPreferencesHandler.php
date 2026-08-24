<?php

declare(strict_types=1);

namespace Vendor\Notifications\Application\Handlers\Queries;

use Vendor\Notifications\Application\Queries\GetPreferencesQuery;
use Vendor\Notifications\Domain\Contracts\PreferenceResolver;
use Vendor\Notifications\Domain\Enums\Category;
use Vendor\Notifications\Domain\Enums\Channel;

final readonly class GetPreferencesHandler
{
    public function __construct(private PreferenceResolver $resolver) {}

    /** @return list<array{category: string, category_label: string, channel: string, channel_label: string, enabled: bool, locked: bool}> */
    public function handle(GetPreferencesQuery $query): array
    {
        $result = [];

        foreach (Category::cases() as $category) {
            foreach (Channel::cases() as $channel) {
                $result[] = [
                    'category' => $category->value,
                    'category_label' => $category->label(),
                    'channel' => $channel->value,
                    'channel_label' => $channel->label(),
                    'enabled' => $this->resolver->isEnabled($query->userId, $category, $channel),
                    // Обязательные уведомления в ленте не выключаются.
                    'locked' => $category->isMandatory() && $channel === Channel::Database,
                ];
            }
        }

        return $result;
    }
}
