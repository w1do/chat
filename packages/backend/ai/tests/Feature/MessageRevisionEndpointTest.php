<?php

declare(strict_types=1);

use Vendor\Ai\Domain\Contracts\TextRevisionProvider;
use Vendor\Ai\Testing\FakeTextRevisionProvider;
use Vendor\Identity\Domain\Models\User;

function fakeProvider(?FakeTextRevisionProvider $provider = null): FakeTextRevisionProvider
{
    $provider ??= new FakeTextRevisionProvider(suggestion: 'Так понятнее');
    app()->instance(TextRevisionProvider::class, $provider);

    return $provider;
}

it('returns a suggestion for every supported operation', function (string $operation, array $extra): void {
    fakeProvider();
    $user = User::factory()->create();

    $this->actingAs($user)
        ->postJson('/api/v1/ai/message-revisions', array_merge([
            'operation' => $operation,
            'text' => 'привет как дела',
        ], $extra))
        ->assertOk()
        ->assertJsonPath('data.operation', $operation)
        ->assertJsonPath('data.suggestion', 'Так понятнее')
        ->assertJsonPath('data.original', 'привет как дела');
})->with([
    ['fix', []],
    ['clarify', []],
    ['shorten', []],
    ['expand', []],
    ['tone', ['tone' => 'friendly']],
    ['custom', ['instruction' => 'сделай список']],
]);

it('rejects an unknown operation and missing extras', function (): void {
    fakeProvider();
    $user = User::factory()->create();

    $this->actingAs($user)->postJson('/api/v1/ai/message-revisions', [
        'operation' => 'translate',
        'text' => 'привет',
    ])->assertStatus(422);

    $this->postJson('/api/v1/ai/message-revisions', ['operation' => 'tone', 'text' => 'привет'])
        ->assertStatus(422);

    $this->postJson('/api/v1/ai/message-revisions', ['operation' => 'custom', 'text' => 'привет'])
        ->assertStatus(422);
});

it('rejects text longer than the limit without calling the provider', function (): void {
    $provider = fakeProvider();
    config()->set('ai.limits.max_input_length', 20);
    $user = User::factory()->create();

    $this->actingAs($user)->postJson('/api/v1/ai/message-revisions', [
        'operation' => 'fix',
        'text' => str_repeat('а', 21),
    ])->assertStatus(422);

    expect($provider->calls)->toBeEmpty();
});

it('answers 429 when the quota is exhausted', function (): void {
    fakeProvider();
    config()->set('ai.limits.per_user_minute', 1);
    $user = User::factory()->create();

    $payload = ['operation' => 'fix', 'text' => 'привет'];

    $this->actingAs($user)->postJson('/api/v1/ai/message-revisions', $payload)->assertOk();
    $this->postJson('/api/v1/ai/message-revisions', $payload)->assertStatus(429);
});

it('answers 503 on provider timeout and failure', function (): void {
    fakeProvider(FakeTextRevisionProvider::failing(timedOut: true));
    $user = User::factory()->create();

    $this->actingAs($user)->postJson('/api/v1/ai/message-revisions', ['operation' => 'fix', 'text' => 'привет'])
        ->assertStatus(503);

    fakeProvider(FakeTextRevisionProvider::failing());
    $this->postJson('/api/v1/ai/message-revisions', ['operation' => 'fix', 'text' => 'привет'])
        ->assertStatus(503);
});

it('answers 503 when the administrator disabled AI', function (): void {
    $provider = fakeProvider();
    config()->set('ai.enabled', false);
    $user = User::factory()->create();

    $this->actingAs($user)->postJson('/api/v1/ai/message-revisions', ['operation' => 'fix', 'text' => 'привет'])
        ->assertStatus(503);

    expect($provider->calls)->toBeEmpty();
});

it('requires authentication', function (): void {
    fakeProvider();

    $this->postJson('/api/v1/ai/message-revisions', ['operation' => 'fix', 'text' => 'привет'])
        ->assertStatus(401);
});
