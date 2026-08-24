<?php

declare(strict_types=1);

namespace Vendor\Chat;

use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;
use Vendor\Chat\Domain\Contracts\MessageSanitizer;
use Vendor\Chat\Domain\Contracts\PresenceRegistry;
use Vendor\Chat\Domain\Events\MessageCreated;
use Vendor\Chat\Domain\Events\MessageDeleted;
use Vendor\Chat\Domain\Events\MessageUpdated;
use Vendor\Chat\Domain\Events\ReactionChanged;
use Vendor\Chat\Domain\Events\RoomMemberChanged;
use Vendor\Chat\Domain\Events\TypingChanged;
use Vendor\Chat\Domain\Models\Message;
use Vendor\Chat\Domain\Models\Room;
use Vendor\Chat\Domain\Models\RoomMember;
use Vendor\Chat\Domain\Policies\MembershipPolicy;
use Vendor\Chat\Domain\Policies\MessagePolicy;
use Vendor\Chat\Domain\Policies\RoomPolicy;
use Vendor\Chat\Infrastructure\Broadcasting\BroadcastsDomainEvents;
use Vendor\Chat\Infrastructure\Presence\RedisPresenceRegistry;
use Vendor\Chat\Infrastructure\Sanitizing\PlainTextSanitizer;

final class ChatServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->mergeConfigFrom(__DIR__.'/../config/chat.php', 'chat');

        // Stateless и immutable — безопасно под Octane; приложение может заменить binding.
        $this->app->bind(MessageSanitizer::class, fn (): MessageSanitizer => new PlainTextSanitizer(
            maxLength: (int) config('chat.message.max_length', 4000),
        ));

        // Stateless-адаптер Redis; приложение может заменить binding (§4.1).
        $this->app->bind(PresenceRegistry::class, RedisPresenceRegistry::class);
    }

    public function boot(): void
    {
        $this->loadMigrationsFrom(__DIR__.'/../database/migrations');

        Gate::policy(Room::class, RoomPolicy::class);
        Gate::policy(RoomMember::class, MembershipPolicy::class);
        Gate::policy(Message::class, MessagePolicy::class);

        // Domain events → версионированные broadcast'ы (после commit).
        Event::listen(MessageCreated::class, [BroadcastsDomainEvents::class, 'onMessageCreated']);
        Event::listen(MessageUpdated::class, [BroadcastsDomainEvents::class, 'onMessageUpdated']);
        Event::listen(MessageDeleted::class, [BroadcastsDomainEvents::class, 'onMessageDeleted']);
        Event::listen(ReactionChanged::class, [BroadcastsDomainEvents::class, 'onReactionChanged']);
        Event::listen(RoomMemberChanged::class, [BroadcastsDomainEvents::class, 'onRoomMemberChanged']);
        Event::listen(TypingChanged::class, [BroadcastsDomainEvents::class, 'onTypingChanged']);

        if (config('chat.routes.enabled', true)) {
            $this->loadRoutesFrom(__DIR__.'/../routes/api.php');
        }

        $this->publishes([
            __DIR__.'/../config/chat.php' => config_path('chat.php'),
        ], 'chat-config');
    }
}
