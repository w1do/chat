<?php

declare(strict_types=1);

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

/**
 * Octane-worker переиспользует загруженное приложение для многих запросов.
 * Последовательные запросы разных пользователей через ОДИН kernel (без
 * пересоздания приложения) не должны видеть чужие identity/данные.
 * Полный прогон против реального FrankenPHP — ./tools/chat smoke octane.
 */
it('does not leak identity between sequential requests of different users', function (): void {
    $alice = User::factory()->create(['name' => 'Alice']);
    $bob = User::factory()->create(['name' => 'Bob']);

    // Один и тот же booted kernel обслуживает запросы по очереди.
    foreach ([[$alice, 'Alice'], [$bob, 'Bob'], [$alice, 'Alice']] as [$user, $expected]) {
        $this->flushSession();
        $response = $this->actingAs($user)->getJson('/api/v1/me');
        $response->assertOk()->assertJsonPath('data.name', $expected);

        // Контейнер не должен удерживать пользователя вне запроса.
        auth()->forgetGuards();
    }
});

it('serves unauthenticated requests after an authenticated one', function (): void {
    $user = User::factory()->create();

    $this->actingAs($user)->getJson('/api/v1/me')->assertOk();

    $this->flushSession();
    auth()->forgetGuards();

    $this->getJson('/api/v1/me')->assertStatus(401);
});

it('detects the leak this suite exists to catch (injected leaky singleton)', function (): void {
    // Негативный контроль: request-состояние в singleton — утечка между
    // запросами. Проверяем, что выбранная методика её ЗАМЕЧАЕТ.
    $leakyCache = new class
    {
        public ?string $lastUserName = null;
    };
    app()->instance('leaky.request.cache', $leakyCache);

    $alice = User::factory()->create(['name' => 'Alice']);
    $bob = User::factory()->create(['name' => 'Bob']);

    $this->actingAs($alice)->getJson('/api/v1/me');
    app('leaky.request.cache')->lastUserName = 'Alice';

    $this->flushSession();
    auth()->forgetGuards();

    $this->actingAs($bob)->getJson('/api/v1/me');

    // Singleton пережил смену пользователя — именно это и есть утечка.
    expect(app('leaky.request.cache')->lastUserName)->toBe('Alice');
});
