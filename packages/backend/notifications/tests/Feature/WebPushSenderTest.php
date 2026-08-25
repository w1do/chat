<?php

declare(strict_types=1);

use Vendor\Identity\Domain\Models\User;
use Vendor\Notifications\Domain\Contracts\PushResult;
use Vendor\Notifications\Domain\Contracts\PushTransport;
use Vendor\Notifications\Domain\Enums\Category;
use Vendor\Notifications\Domain\Models\PushSubscription;
use Vendor\Notifications\Infrastructure\Push\PushDeliveryFailed;
use Vendor\Notifications\Infrastructure\Push\WebPushSender;
use Vendor\Notifications\Testing\FakePushTransport;

/** Реальный ключ VAPID не нужен: проверяем настроенность и подготовку данных. */
function configurePush(bool $configured = true): void
{
    config()->set('notifications.push.public_key', $configured ? 'BPublicKeyForTests' : null);
    config()->set('notifications.push.private_key', $configured ? 'PrivateKeyForTests' : null);
    config()->set('notifications.push.subject', 'mailto:admin@example.com');
}

/** Подписка устройства с предсказуемым endpoint. */
function subscribeDevice(string $userId, string $endpoint): void
{
    PushSubscription::query()->create([
        'user_id' => $userId,
        'endpoint' => $endpoint,
        'endpoint_hash' => PushSubscription::hashEndpoint($endpoint),
        'p256dh' => 'key',
        'auth' => 'auth',
    ]);
}

function fakeTransport(): FakePushTransport
{
    $transport = new FakePushTransport;
    app()->instance(PushTransport::class, $transport);

    return $transport;
}

function pushPayload(array $extra = []): array
{
    return array_merge([
        'room_id' => 'room-1',
        'room_name' => 'Семья',
        'actor_name' => 'Алексей',
        'preview' => 'рецепт борща',
        'message_id' => 'm-1',
    ], $extra);
}

it('treats push as disabled until both VAPID keys are set', function (): void {
    configurePush(false);
    expect(app(WebPushSender::class)->isConfigured())->toBeFalse();

    config()->set('notifications.push.public_key', 'BPublicKeyForTests');
    expect(app(WebPushSender::class)->isConfigured())->toBeFalse();

    config()->set('notifications.push.private_key', 'PrivateKeyForTests');
    expect(app(WebPushSender::class)->isConfigured())->toBeTrue();
});

it('sends nothing when push is not configured', function (): void {
    configurePush(false);

    PushSubscription::query()->create([
        'user_id' => 'u1',
        'endpoint' => 'https://push.example.com/1',
        'endpoint_hash' => PushSubscription::hashEndpoint('https://push.example.com/1'),
        'p256dh' => 'key',
        'auth' => 'auth',
    ]);

    expect(app(WebPushSender::class)->send('u1', Category::Message, pushPayload()))->toBe(0);
});

it('sends nothing when the user has no devices', function (): void {
    configurePush();

    expect(app(WebPushSender::class)->send('u-without-devices', Category::Message, pushPayload()))->toBe(0);
});

it('builds a notification with room, author and a short preview only', function (): void {
    configurePush();
    config()->set('notifications.push.preview_length', 10);

    $sender = app(WebPushSender::class);
    $method = new ReflectionMethod($sender, 'notification');
    $notification = $method->invoke($sender, Category::Message, pushPayload([
        'preview' => 'очень длинный текст сообщения, который не должен уехать целиком',
        'message_id' => 'internal-message-identifier',
    ]));

    expect($notification['title'])->toBe('Семья')
        ->and($notification['body'])->toStartWith('Алексей: ')
        ->and($notification['body'])->toEndWith('…')
        ->and(mb_strlen($notification['body']))->toBeLessThan(40)
        ->and($notification['url'])->toBe('/rooms/room-1');

    // Ни ключей, ни идентификаторов сверх нужного.
    $encoded = json_encode($notification, JSON_UNESCAPED_UNICODE);
    expect($encoded)->not->toContain('PrivateKeyForTests')
        ->and($encoded)->not->toContain('internal-message-identifier');
});

it('delivers to every device of the recipient', function (): void {
    configurePush();
    $transport = fakeTransport();
    subscribeDevice('u1', 'https://push.example.com/phone');
    subscribeDevice('u1', 'https://push.example.com/laptop');

    expect(app(WebPushSender::class)->send('u1', Category::Message, pushPayload()))->toBe(2)
        ->and($transport->sent)->toHaveCount(2);
});

it('drops a subscription the push service says is gone', function (): void {
    configurePush();
    $transport = fakeTransport();
    $transport->answerWith(PushResult::gone());
    subscribeDevice('u1', 'https://push.example.com/dead');

    expect(app(WebPushSender::class)->send('u1', Category::Message, pushPayload()))->toBe(0)
        ->and(PushSubscription::query()->count())->toBe(0);
});

it('raises other failures so the queue retries, keeping the subscription', function (): void {
    configurePush();
    $transport = fakeTransport();
    $transport->answerWith(PushResult::failed('service unavailable'));
    subscribeDevice('u1', 'https://push.example.com/flaky');

    expect(fn () => app(WebPushSender::class)->send('u1', Category::Message, pushPayload()))
        ->toThrow(PushDeliveryFailed::class);

    expect(PushSubscription::query()->count())->toBe(1);
});

it('explains the test command when push is off or the user has no devices', function (): void {
    configurePush(false);

    $this->artisan('chat:push-test', ['login' => 'кто-угодно'])
        ->expectsOutputToContain('Push выключены')
        ->assertFailed();

    configurePush();
    $user = User::factory()->create(['username' => 'без-устройств']);

    $this->artisan('chat:push-test', ['login' => $user->username])
        ->expectsOutputToContain('нет подписанных устройств')
        ->assertFailed();
});

it('reports how many devices got the test push', function (): void {
    configurePush();
    fakeTransport();
    $user = User::factory()->create(['username' => 'с-устройством']);
    subscribeDevice((string) $user->getKey(), 'https://push.example.com/test-device');

    $this->artisan('chat:push-test', ['login' => $user->username])
        ->expectsOutputToContain('Отправлено устройств: 1 из 1')
        ->assertSuccessful();
});
