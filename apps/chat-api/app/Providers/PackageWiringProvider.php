<?php

declare(strict_types=1);

namespace App\Providers;

use App\Notifications\NotifiesRoomActivity;
use App\Notifications\PresenceActivityInspector;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\ServiceProvider;
use Vendor\Chat\Domain\Events\MessageCreated;
use Vendor\Chat\Domain\Events\RoomMemberChanged;
use Vendor\Notifications\Domain\Contracts\ActivityInspector;

/**
 * Единственная точка связывания пакетов (STRUCTURE.md §2):
 * chat → notifications и chat → audit регистрируются здесь.
 */
final class PackageWiringProvider extends ServiceProvider
{
    public function register(): void
    {
        // «Активен в комнате» для правила «не уведомлять того, кто уже здесь».
        $this->app->bind(ActivityInspector::class, PresenceActivityInspector::class);
    }

    public function boot(): void
    {
        Event::listen(MessageCreated::class, [NotifiesRoomActivity::class, 'onMessageCreated']);
        Event::listen(RoomMemberChanged::class, [NotifiesRoomActivity::class, 'onRoomMemberChanged']);
    }
}
