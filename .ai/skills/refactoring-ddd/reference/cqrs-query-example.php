<?php

namespace App\Domain\User\Queries;

use App\Domain\User\Models\User;
use Illuminate\Support\Collection;

/**
 * Query - используется для получения данных (Read Layer).
 * Может возвращать коллекции, модели или специальные Read Models.
 */
class GetActiveUsersWithRecentPostsQuery
{
    /**
     * @return Collection<int, User>
     */
    public function handle(int $limit = 10): Collection
    {
        return User::query()
            ->where('is_active', true)
            ->with(['posts' => fn($q) => $q->latest()->limit(3)])
            ->limit($limit)
            ->get();
    }
}
