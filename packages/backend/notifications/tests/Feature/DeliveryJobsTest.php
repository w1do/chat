<?php

declare(strict_types=1);

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Vendor\Identity\Domain\Models\User;
use Vendor\Notifications\Domain\Enums\Category;
use Vendor\Notifications\Domain\Enums\Channel;
use Vendor\Notifications\Infrastructure\Jobs\DeliverNotificationJob;
use Vendor\Notifications\Infrastructure\Jobs\SendDigestJob;

/** Транспорт array копит письма — считаем их напрямую. */
function sentMailCount(): int
{
    return app('mailer')->getSymfonyTransport()->messages()->count();
}

function deliveryJob(User $recipient, ?string $notificationId = null): DeliverNotificationJob
{
    return new DeliverNotificationJob(
        recipientId: (string) $recipient->getKey(),
        category: Category::Mention,
        channel: Channel::Mail,
        payload: [
            'category' => 'mention',
            'room_id' => 'room-1',
            'room_name' => 'Общая',
            'actor_name' => 'Алиса',
            'preview' => 'Привет',
            'message_id' => 'message-1',
        ],
        notificationId: $notificationId,
    );
}

it('sends mail only to recipients who have an email', function (): void {
    $withEmail = User::factory()->withEmail('mail@example.com')->create();
    $withoutEmail = User::factory()->create();

    app()->call([deliveryJob($withEmail), 'handle']);
    expect(sentMailCount())->toBe(1);

    // Вход по логину не требует почты — таким адресатам письма не уходят.
    app()->call([deliveryJob($withoutEmail), 'handle']);
    expect(sentMailCount())->toBe(1);
});

it('declares retry, timeout and backoff policy', function (): void {
    $job = deliveryJob(User::factory()->create());

    expect($job->tries())->toBe(3)
        ->and($job->timeout())->toBe(30)
        ->and($job->backoff())->toBe([10, 60, 300])
        ->and($job->uniqueFor())->toBeGreaterThan(0);
});

it('uses the same unique id for duplicate deliveries of one notification', function (): void {
    $recipient = User::factory()->create();
    $notificationId = (string) Str::uuid();

    expect(deliveryJob($recipient, $notificationId)->uniqueId())
        ->toBe(deliveryJob($recipient, $notificationId)->uniqueId())
        // Разные поводы не считаются дублем.
        ->and(deliveryJob($recipient, (string) Str::uuid())->uniqueId())
        ->not->toBe(deliveryJob($recipient, $notificationId)->uniqueId());
});

it('records a failure without touching stored data', function (): void {
    $recipient = User::factory()->create();
    $id = (string) Str::uuid();

    DB::table('notifications')->insert([
        'id' => $id,
        'type' => 'chat.mention',
        'notifiable_type' => 'user',
        'notifiable_id' => $recipient->getKey(),
        'data' => json_encode(['category' => 'mention'], JSON_UNESCAPED_UNICODE),
        'group_count' => 1,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    // Провайдер почты падает: сообщение и лента не страдают.
    deliveryJob($recipient, $id)->failed(new RuntimeException('smtp is down'));

    expect(DB::table('notifications')->where('id', $id)->exists())->toBeTrue();
});

it('sends a digest only when something is unread', function (): void {
    $recipient = User::factory()->withEmail('digest@example.com')->create();
    $before = sentMailCount();

    $since = (string) now()->subDay();

    app()->call([new SendDigestJob((string) $recipient->getKey(), $since), 'handle']);
    expect(sentMailCount())->toBe($before);

    DB::table('notifications')->insert([
        'id' => (string) Str::uuid(),
        'type' => 'chat.message',
        'notifiable_type' => 'user',
        'notifiable_id' => $recipient->getKey(),
        'data' => json_encode(['category' => 'message'], JSON_UNESCAPED_UNICODE),
        'group_count' => 1,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    app()->call([new SendDigestJob((string) $recipient->getKey(), $since), 'handle']);
    expect(sentMailCount())->toBe($before + 1);
});
