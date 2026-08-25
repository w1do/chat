<?php

declare(strict_types=1);

namespace App\Providers;

use App\Administration\ReadinessSystemProbe;
use App\Administration\RecordsAiAudit;
use App\Administration\RecordsRoomAudit;
use App\Models\User;
use App\Notifications\NotifiesRoomActivity;
use App\Notifications\PresenceActivityInspector;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Contracts\Auth\Access\Gate as GateContract;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Laravel\Horizon\Horizon;
use Spatie\Permission\PermissionRegistrar;
use Vendor\Administration\Domain\Contracts\SystemProbe;
use Vendor\Ai\Domain\Events\RevisionRecorded;
use Vendor\Chat\Domain\Events\MessageCreated;
use Vendor\Chat\Domain\Events\RoomDeleted;
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

        // Состояние зависимостей для админ-панели — та же readiness-проверка.
        $this->app->bind(SystemProbe::class, ReadinessSystemProbe::class);
    }

    public function boot(): void
    {
        // Вступление по ссылке создаёт аккаунты, поэтому ограничено по адресу.
        RateLimiter::for('chat-invite-accept', fn (Request $request) => Limit::perMinute(
            (int) config('chat.invites.accept_per_minute', 10),
        )->by($request->ip()));

        Event::listen(MessageCreated::class, [NotifiesRoomActivity::class, 'onMessageCreated']);
        Event::listen(RoomMemberChanged::class, [NotifiesRoomActivity::class, 'onRoomMemberChanged']);

        // Удаление комнаты необратимо — записываем его в журнал аудита.
        Event::listen(RoomDeleted::class, [RecordsRoomAudit::class, 'onRoomDeleted']);

        // AI-обращения попадают в журнал аудита безопасными метаданными.
        Event::listen(RevisionRecorded::class, [RecordsAiAudit::class, 'onRevisionRecorded']);

        // Провайдеры пакетов резолвят Gate в своих boot (Gate::policy), поэтому
        // afterResolving-регистрация spatie может не сработать: включаем
        // проверку прав явно, когда всё приложение уже загружено.
        $this->app->booted(function (): void {
            $this->app->make(PermissionRegistrar::class)->registerPermissions($this->app->make(GateContract::class));

            // Роль super-admin открывает все права; отдельные права выдаются ролям.
            Gate::before(static fn (User $user): ?bool => $user->hasRole('super-admin') ? true : null);

            // Horizon dashboard — только администраторам (CLAUDE.md §14).
            Gate::define('viewHorizon', static fn (User $user): bool => $user->hasRole('super-admin'));

            Horizon::auth(static fn (Request $request): bool => $request->user() !== null
                && Gate::forUser($request->user())->allows('viewHorizon'));
        });
    }
}
