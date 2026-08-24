<?php

declare(strict_types=1);

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Vendor\Ai\Domain\Contracts\TextRevisionProvider;
use Vendor\Ai\Domain\Models\AiRequest;
use Vendor\Ai\Testing\FakeTextRevisionProvider;
use Vendor\Chat\Domain\Models\Room;
use Vendor\Chat\Domain\Models\RoomMember;

uses(RefreshDatabase::class);

beforeEach(function (): void {
    config()->set('ai.enabled', true);
});

it('returns a suggestion through the composed application', function (): void {
    app()->instance(TextRevisionProvider::class, new FakeTextRevisionProvider(suggestion: 'Так понятнее'));
    $user = User::factory()->create();

    $this->actingAs($user)->postJson('/api/v1/ai/message-revisions', [
        'operation' => 'clarify',
        'text' => 'привет как дела',
    ])->assertOk()->assertJsonPath('data.suggestion', 'Так понятнее');

    expect(AiRequest::query()->where('user_id', $user->getKey())->count())->toBe(1);
});

it('renders AI failures in the error envelope without leaking internals', function (): void {
    app()->instance(TextRevisionProvider::class, FakeTextRevisionProvider::failing(timedOut: true));
    $user = User::factory()->create();

    $response = $this->actingAs($user)->postJson('/api/v1/ai/message-revisions', [
        'operation' => 'fix',
        'text' => 'привет',
    ])->assertStatus(503)->assertJsonStructure(['code', 'message', 'details', 'trace_id']);

    expect($response->getContent())->not->toContain('api_key')->not->toContain('Bearer');
});

it('keeps chat working while AI is disabled', function (): void {
    config()->set('ai.enabled', false);
    $room = Room::factory()->create();
    $user = User::factory()->create();
    RoomMember::factory()->for($room)->create(['user_id' => $user->getKey()]);

    $this->actingAs($user)->postJson('/api/v1/ai/message-revisions', ['operation' => 'fix', 'text' => 'привет'])
        ->assertStatus(503);

    // Обычная отправка сообщения не страдает.
    $this->postJson("/api/v1/rooms/{$room->id}/messages", ['body' => 'Работает и без помощника'])
        ->assertCreated();
});

it('sends only the draft to the provider over HTTP', function (): void {
    Http::fake([
        '*/chat/completions' => Http::response([
            'model' => 'openai/gpt-4o-mini',
            'choices' => [['message' => ['content' => 'Так понятнее']]],
            'usage' => ['prompt_tokens' => 10, 'completion_tokens' => 5],
        ]),
    ]);

    config()->set('ai.provider', 'polza');
    config()->set('ai.providers.polza.api_key', 'test-key');
    $user = User::factory()->create();

    $this->actingAs($user)->postJson('/api/v1/ai/message-revisions', [
        'operation' => 'fix',
        'text' => 'привет как дела',
    ])->assertOk()->assertJsonPath('data.model', 'openai/gpt-4o-mini');

    Http::assertSent(function ($request): bool {
        $messages = $request->data()['messages'];

        // В запросе только системный промпт и сам черновик: истории комнаты нет.
        return count($messages) === 2
            && $messages[0]['role'] === 'system'
            && $messages[1]['content'] === 'привет как дела'
            && $request->hasHeader('Authorization');
    });
});
