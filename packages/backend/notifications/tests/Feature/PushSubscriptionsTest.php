<?php

declare(strict_types=1);

use Vendor\Notifications\Domain\Models\PushSubscription;

const ENDPOINT = 'https://fcm.googleapis.com/fcm/send/abc123';

function subscribePayload(string $endpoint = ENDPOINT): array
{
    return [
        'endpoint' => $endpoint,
        'keys' => ['p256dh' => 'BPublicKeyValue', 'auth' => 'AuthSecret'],
    ];
}

it('saves a subscription for the current user', function (): void {
    $user = $this->actingAsUser();

    $this->postJson('/api/v1/push-subscriptions', subscribePayload())
        ->assertCreated()
        ->assertJsonStructure(['data' => ['id']]);

    $subscription = PushSubscription::query()->sole();

    expect($subscription->user_id)->toBe((string) $user->getKey())
        ->and($subscription->endpoint)->toBe(ENDPOINT)
        ->and($subscription->last_used_at)->not->toBeNull();
});

it('keeps one record per device when the browser resubscribes', function (): void {
    $this->actingAsUser();

    $this->postJson('/api/v1/push-subscriptions', subscribePayload())->assertCreated();
    $this->postJson('/api/v1/push-subscriptions', [
        'endpoint' => ENDPOINT,
        'keys' => ['p256dh' => 'BRotatedKey', 'auth' => 'RotatedAuth'],
    ])->assertCreated();

    expect(PushSubscription::query()->count())->toBe(1)
        ->and(PushSubscription::query()->sole()->p256dh)->toBe('BRotatedKey');
});

it('is safe to send the very same subscription on every app start', function (): void {
    // Приложение сверяет подписку с сервером при каждом запуске: повтор не
    // должен ни плодить записи, ни менять устройство.
    $this->actingAsUser();

    $this->postJson('/api/v1/push-subscriptions', subscribePayload())->assertCreated();
    $first = PushSubscription::query()->sole();

    $this->travel(2)->minutes();
    $this->postJson('/api/v1/push-subscriptions', subscribePayload())->assertCreated();

    $again = PushSubscription::query()->sole();
    expect(PushSubscription::query()->count())->toBe(1)
        ->and($again->id)->toBe($first->id)
        ->and($again->endpoint)->toBe($first->endpoint)
        // Устройство подтвердило, что живо.
        ->and($again->last_used_at->greaterThan($first->last_used_at))->toBeTrue();
});

it('removes the subscription on unsubscribe', function (): void {
    $this->actingAsUser();

    $this->postJson('/api/v1/push-subscriptions', subscribePayload())->assertCreated();
    $this->deleteJson('/api/v1/push-subscriptions', ['endpoint' => ENDPOINT])->assertNoContent();

    expect(PushSubscription::query()->count())->toBe(0);
});

it('never removes a subscription that belongs to someone else', function (): void {
    $owner = $this->actingAsUser();
    $this->postJson('/api/v1/push-subscriptions', subscribePayload())->assertCreated();

    $this->actingAsUser();
    $this->deleteJson('/api/v1/push-subscriptions', ['endpoint' => ENDPOINT])->assertNoContent();

    expect(PushSubscription::query()->sole()->user_id)->toBe((string) $owner->getKey());
});

it('requires authentication', function (): void {
    $this->postJson('/api/v1/push-subscriptions', subscribePayload())->assertStatus(401);
});

it('rejects a malformed subscription', function (): void {
    $this->actingAsUser();

    $this->postJson('/api/v1/push-subscriptions', ['endpoint' => 'not-a-url'])->assertStatus(422);
});
