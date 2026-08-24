<?php

declare(strict_types=1);

use App\Support\Readiness\ComponentCheck;
use App\Support\Readiness\ComponentStatus;
use App\Support\Readiness\ReadinessProbe;

function fakeCheck(string $name, bool $ok): ComponentCheck
{
    return new class($name, $ok) implements ComponentCheck
    {
        public function __construct(private string $name, private bool $ok) {}

        public function name(): string
        {
            return $this->name;
        }

        public function check(): ComponentStatus
        {
            return $this->ok ? ComponentStatus::ok() : ComponentStatus::fail('unreachable');
        }
    };
}

it('reports ok when every component is healthy', function (): void {
    $this->swap(ReadinessProbe::class, new ReadinessProbe([
        fakeCheck('database', true),
        fakeCheck('redis', true),
        fakeCheck('queue', true),
        fakeCheck('websocket', true),
        fakeCheck('search', true),
    ]));

    $this->getJson('/api/v1/readiness')
        ->assertOk()
        ->assertJsonPath('status', 'ok')
        ->assertJsonPath('components.database.status', 'ok')
        ->assertJsonPath('components.websocket.status', 'ok');
});

it('reports 503 degraded when a component fails', function (): void {
    $this->swap(ReadinessProbe::class, new ReadinessProbe([
        fakeCheck('database', true),
        fakeCheck('redis', true),
        fakeCheck('queue', false),
        fakeCheck('websocket', true),
        fakeCheck('search', true),
    ]));

    $this->getJson('/api/v1/readiness')
        ->assertStatus(503)
        ->assertJsonPath('status', 'degraded')
        ->assertJsonPath('components.queue.status', 'fail');
});

it('degrades through real checks when dependencies are absent and leaks no connection details', function (): void {
    // Реальные проверки против недоступных зависимостей тестового окружения:
    // websocket/search/queue недостижимы, database (sqlite) — жив.
    config()->set('services.reverb_server', ['host' => '127.0.0.1', 'port' => 59998]);
    config()->set('services.typesense', ['host' => '127.0.0.1', 'port' => 59999, 'api_key' => 'secret-key']);
    config()->set('database.redis.default.port', 59997);
    config()->set('database.redis.default.password', 'secret-redis-password');

    $response = $this->getJson('/api/v1/readiness')->assertStatus(503);

    $response->assertJsonPath('components.database.status', 'ok');
    $response->assertJsonPath('components.websocket.status', 'fail');
    $response->assertJsonPath('components.search.status', 'fail');

    $body = $response->getContent();
    expect($body)->not->toContain('secret-key')
        ->not->toContain('secret-redis-password')
        ->not->toContain('127.0.0.1')
        ->not->toContain('59999');
});
