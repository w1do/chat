<?php

declare(strict_types=1);

namespace Vendor\Notifications\Domain\Contracts;

use Vendor\Notifications\Domain\Enums\Category;
use Vendor\Notifications\Domain\Enums\Channel;

interface PreferenceResolver
{
    /** @return list<Channel> каналы, включённые у пользователя для категории */
    public function channelsFor(string $userId, Category $category): array;

    public function isEnabled(string $userId, Category $category, Channel $channel): bool;
}
