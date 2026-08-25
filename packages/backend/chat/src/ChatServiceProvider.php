<?php

declare(strict_types=1);

namespace Vendor\Chat;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Client\Factory;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Vendor\Chat\Domain\Contracts\MessageIndex;
use Vendor\Chat\Domain\Contracts\MessageSanitizer;
use Vendor\Chat\Domain\Contracts\PresenceRegistry;
use Vendor\Chat\Domain\Events\MessageCreated;
use Vendor\Chat\Domain\Events\MessageDeleted;
use Vendor\Chat\Domain\Events\MessageUpdated;
use Vendor\Chat\Domain\Events\ReactionChanged;
use Vendor\Chat\Domain\Events\RoomDeleted;
use Vendor\Chat\Domain\Events\RoomMemberChanged;
use Vendor\Chat\Domain\Events\TypingChanged;
use Vendor\Chat\Domain\Models\Message;
use Vendor\Chat\Domain\Models\Room;
use Vendor\Chat\Domain\Models\RoomMember;
use Vendor\Chat\Domain\Policies\MembershipPolicy;
use Vendor\Chat\Domain\Policies\MessagePolicy;
use Vendor\Chat\Domain\Policies\RoomPolicy;
use Vendor\Chat\Domain\ValueObjects\SearchConfig;
use Vendor\Chat\Infrastructure\Broadcasting\BroadcastsDomainEvents;
use Vendor\Chat\Infrastructure\Presence\RedisPresenceRegistry;
use Vendor\Chat\Infrastructure\Sanitizing\PlainTextSanitizer;
use Vendor\Chat\Infrastructure\Search\IndexesMessages;
use Vendor\Chat\Infrastructure\Search\NullMessageIndex;
use Vendor\Chat\Infrastructure\Search\TypesenseMessageIndex;
use Vendor\Chat\Presentation\Console\ReindexMessagesCommand;

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

        // Конфигурация поиска проверяется при первом обращении: пустой
        // обязательный параметр — ошибка, а не тихо неработающий индекс.
        $this->app->bind(MessageIndex::class, function ($app): MessageIndex {
            $config = SearchConfig::fromArray((array) config('chat.search', []));

            return $config->enabled
                ? new TypesenseMessageIndex($app->make(Factory::class), $config)
                : new NullMessageIndex;
        });
    }

    public function boot(): void
    {
        $this->loadMigrationsFrom(__DIR__.'/../database/migrations');

        // Ссылка — это доступ: и раздачу, и вход по ней ограничиваем.
        RateLimiter::for('chat-invites', fn (Request $request) => Limit::perMinute(
            (int) config('chat.invites.create_per_minute', 10),
        )->by((string) $request->user()?->getAuthIdentifier()));

        // Загрузка картинок дороже обычного запроса: и по трафику, и по обработке.
        RateLimiter::for('chat-images', fn (Request $request) => Limit::perMinute(
            (int) config('chat.images.per_minute', 20),
        )->by((string) $request->user()?->getAuthIdentifier()));

        RateLimiter::for('chat-invite-lookup', fn (Request $request) => Limit::perMinute(
            (int) config('chat.invites.lookup_per_minute', 20),
        )->by($request->ip()));

        Gate::policy(Room::class, RoomPolicy::class);
        Gate::policy(RoomMember::class, MembershipPolicy::class);
        Gate::policy(Message::class, MessagePolicy::class);

        // Domain events → версионированные broadcast'ы (после commit).
        Event::listen(MessageCreated::class, [BroadcastsDomainEvents::class, 'onMessageCreated']);
        Event::listen(MessageUpdated::class, [BroadcastsDomainEvents::class, 'onMessageUpdated']);
        Event::listen(MessageDeleted::class, [BroadcastsDomainEvents::class, 'onMessageDeleted']);
        Event::listen(ReactionChanged::class, [BroadcastsDomainEvents::class, 'onReactionChanged']);
        Event::listen(RoomMemberChanged::class, [BroadcastsDomainEvents::class, 'onRoomMemberChanged']);
        Event::listen(RoomDeleted::class, [BroadcastsDomainEvents::class, 'onRoomDeleted']);
        Event::listen(TypingChanged::class, [BroadcastsDomainEvents::class, 'onTypingChanged']);

        // Индексация после commit; порядок и повторы безопасны (этап 9).
        Event::listen(MessageCreated::class, [IndexesMessages::class, 'onMessageCreated']);
        Event::listen(MessageUpdated::class, [IndexesMessages::class, 'onMessageUpdated']);
        Event::listen(MessageDeleted::class, [IndexesMessages::class, 'onMessageDeleted']);
        Event::listen(RoomDeleted::class, [IndexesMessages::class, 'onRoomDeleted']);

        if ($this->app->runningInConsole()) {
            $this->commands([ReindexMessagesCommand::class]);
        }

        if (config('chat.routes.enabled', true)) {
            $this->loadRoutesFrom(__DIR__.'/../routes/api.php');
        }

        $this->publishes([
            __DIR__.'/../config/chat.php' => config_path('chat.php'),
        ], 'chat-config');
    }
}
