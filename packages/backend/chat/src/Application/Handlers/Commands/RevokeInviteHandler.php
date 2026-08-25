<?php

declare(strict_types=1);

namespace Vendor\Chat\Application\Handlers\Commands;

use Illuminate\Support\Carbon;
use Vendor\Chat\Domain\Models\RoomInvite;

final readonly class RevokeInviteHandler
{
    /** Отзыв немедленный: ссылка перестаёт работать с этой секунды. */
    public function handle(string $inviteId): void
    {
        RoomInvite::query()
            ->whereKey($inviteId)
            ->whereNull('revoked_at')
            ->update(['revoked_at' => Carbon::now()]);
    }
}
