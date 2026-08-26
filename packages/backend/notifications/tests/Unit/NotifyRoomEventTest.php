<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\DB;
use Vendor\Identity\Domain\Models\User;
use Vendor\Notifications\Application\Commands\NotifyRoomEventCommand;
use Vendor\Notifications\Application\Handlers\Commands\NotifyRoomEventHandler;
use Vendor\Notifications\Domain\Contracts\ActivityInspector;
use Vendor\Notifications\Domain\Enums\Category;
use Vendor\Notifications\Domain\Enums\Channel;
use Vendor\Notifications\Domain\Models\NotificationPreference;
use Vendor\Notifications\Infrastructure\Jobs\DeliverNotificationJob;
use Vendor\Notifications\Infrastructure\Jobs\SendDigestJob;

/** Подменяем присутствие: список активных задаётся тестом. */
function activeIn(array $activeUserIds): void
{
    app()->instance(ActivityInspector::class, new class($activeUserIds) implements ActivityInspector
    {
        public function __construct(private array $active) {}

        public function isActiveIn(string $roomId, string $userId): bool
        {
            return in_array($userId, $this->active, true);
        }
    });
}

function notifyCommand(string $actorId, array $recipients, Category $category = Category::Message): NotifyRoomEventCommand
{
    return new NotifyRoomEventCommand(
        category: $category,
        roomId: 'room-1',
        roomName: 'Общая',
        actorId: $actorId,
        actorName: 'Алиса',
        recipientIds: $recipients,
        preview: 'Привет всем',
        messageId: 'message-1',
    );
}

it('creates a notification for a recipient who is not in the room', function (): void {
    activeIn([]);
    $recipient = User::factory()->create();

    app(NotifyRoomEventHandler::class)->handle(notifyCommand('actor-1', [(string) $recipient->getKey()]));

    $row = DB::table('notifications')->where('notifiable_id', $recipient->getKey())->first();

    expect($row)->not->toBeNull()
        ->and(json_decode((string) $row->data, true)['room_name'])->toBe('Общая');
});

it('names the sender instead of the room for a direct conversation', function (): void {
    activeIn([]);
    $recipient = User::factory()->create();

    app(NotifyRoomEventHandler::class)->handle(new NotifyRoomEventCommand(
        category: Category::Message,
        roomId: 'direct-1',
        roomName: null,
        actorId: 'actor-1',
        actorName: 'Алиса',
        recipientIds: [(string) $recipient->getKey()],
        preview: 'Привет лично',
        messageId: 'message-1',
    ));

    $data = json_decode((string) DB::table('notifications')
        ->where('notifiable_id', $recipient->getKey())
        ->value('data'), true);

    // Названия комнаты нет — уведомление опирается на отправителя.
    expect($data['room_name'])->toBeNull()
        ->and($data['actor_name'])->toBe('Алиса')
        ->and($data['room_id'])->toBe('direct-1');
});

it('stays silent for a recipient who is active in that room', function (): void {
    $recipient = User::factory()->create();
    activeIn([(string) $recipient->getKey()]);

    app(NotifyRoomEventHandler::class)->handle(notifyCommand('actor-1', [(string) $recipient->getKey()]));

    expect(DB::table('notifications')->count())->toBe(0);
});

it('never notifies the initiator, even on a self-mention', function (): void {
    activeIn([]);
    $actor = User::factory()->create();

    app(NotifyRoomEventHandler::class)->handle(notifyCommand(
        (string) $actor->getKey(),
        [(string) $actor->getKey()],
        Category::Mention,
    ));

    expect(DB::table('notifications')->count())->toBe(0);
});

it('groups repeated room events inside the window instead of piling up', function (): void {
    activeIn([]);
    config()->set('notifications.grouping.message', 900);
    $recipient = User::factory()->create();

    foreach (range(1, 3) as $ignored) {
        app(NotifyRoomEventHandler::class)->handle(notifyCommand('actor-1', [(string) $recipient->getKey()]));
    }

    $rows = DB::table('notifications')->where('notifiable_id', $recipient->getKey())->get();

    expect($rows)->toHaveCount(1)
        ->and($rows->first()->group_count)->toBe(3);
});

it('starts a new notification when the grouping window has passed', function (): void {
    activeIn([]);
    config()->set('notifications.grouping.message', 0);
    $recipient = User::factory()->create();

    app(NotifyRoomEventHandler::class)->handle(notifyCommand('actor-1', [(string) $recipient->getKey()]));
    app(NotifyRoomEventHandler::class)->handle(notifyCommand('actor-1', [(string) $recipient->getKey()]));

    expect(DB::table('notifications')->where('notifiable_id', $recipient->getKey())->count())->toBe(2);
});

it('queues slow channels per category and respects preferences', function (): void {
    Bus::fake();
    activeIn([]);
    $recipient = User::factory()->create();

    // Почта для упоминаний включена по умолчанию.
    app(NotifyRoomEventHandler::class)->handle(notifyCommand('actor-1', [(string) $recipient->getKey()], Category::Mention));

    Bus::assertDispatched(DeliverNotificationJob::class, function (DeliverNotificationJob $job) use ($recipient): bool {
        return $job->recipientId === (string) $recipient->getKey()
            && $job->channel === Channel::Mail
            && $job->queue === 'notifications';
    });

    // Пользователь выключает почту для упоминаний.
    NotificationPreference::query()->create([
        'user_id' => $recipient->getKey(),
        'category' => 'mention',
        'channel' => 'mail',
        'enabled' => false,
    ]);
    Bus::fake();

    app(NotifyRoomEventHandler::class)->handle(notifyCommand('actor-1', [(string) $recipient->getKey()], Category::Mention));

    // Почта отключена, а push — отдельный канал и продолжает работать.
    Bus::assertNotDispatched(
        DeliverNotificationJob::class,
        fn (DeliverNotificationJob $job): bool => $job->channel === Channel::Mail,
    );
    Bus::assertDispatched(
        DeliverNotificationJob::class,
        fn (DeliverNotificationJob $job): bool => $job->channel === Channel::Push,
    );

    // Лента при этом продолжает работать.
    expect(DB::table('notifications')->where('notifiable_id', $recipient->getKey())->count())->toBeGreaterThan(0);
});

it('stops sending push once the user turns the channel off', function (): void {
    Bus::fake();
    activeIn([]);
    $recipient = User::factory()->create();

    NotificationPreference::query()->create([
        'user_id' => $recipient->getKey(),
        'category' => 'message',
        'channel' => 'push',
        'enabled' => false,
    ]);

    app(NotifyRoomEventHandler::class)->handle(notifyCommand('actor-1', [(string) $recipient->getKey()]));

    Bus::assertNotDispatched(
        DeliverNotificationJob::class,
        fn (DeliverNotificationJob $job): bool => $job->channel === Channel::Push,
    );
    // Лента остаётся: тумблер push не выключает уведомления внутри приложения.
    expect(DB::table('notifications')->where('notifiable_id', $recipient->getKey())->count())->toBe(1);
});

it('does not park a new message behind mass mailings', function (): void {
    Bus::fake();
    activeIn([]);
    $recipient = User::factory()->create();

    NotificationPreference::query()->create([
        'user_id' => $recipient->getKey(),
        'category' => 'message',
        'channel' => 'mail',
        'enabled' => true,
    ]);

    app(NotifyRoomEventHandler::class)->handle(notifyCommand('actor-1', [(string) $recipient->getKey()]));

    // Живой разговор идёт по обычной очереди уведомлений, а не по очереди рассылок.
    Bus::assertDispatched(
        DeliverNotificationJob::class,
        fn (DeliverNotificationJob $job): bool => $job->queue === 'notifications',
    );
});

it('keeps every category on its own queue', function (): void {
    expect(Category::Security->queue())->toBe('notifications-critical')
        ->and(Category::Message->queue())->toBe('notifications')
        ->and(Category::Mention->queue())->toBe('notifications')
        ->and(Category::RoomInvite->queue())->toBe('notifications')
        // Очередь рассылок остаётся сводкам: они могут подождать.
        ->and((new SendDigestJob('u1', '2026-08-25T00:00:00Z'))->queue)->toBe('notifications-bulk');
});
