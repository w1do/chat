<?php

declare(strict_types=1);

namespace Vendor\Notifications\Application\Handlers\Commands;

use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Vendor\Notifications\Application\Commands\MarkNotificationsReadCommand;

final readonly class MarkNotificationsReadHandler
{
    /** @return int сколько записей отмечено */
    public function handle(MarkNotificationsReadCommand $command): int
    {
        return DB::table('notifications')
            // Чужие уведомления недоступны даже по идентификатору.
            ->where('notifiable_id', $command->userId)
            ->whereNull('read_at')
            ->when($command->ids !== null, fn ($builder) => $builder->whereIn('id', $command->ids))
            ->update(['read_at' => Carbon::now(), 'updated_at' => Carbon::now()]);
    }
}
