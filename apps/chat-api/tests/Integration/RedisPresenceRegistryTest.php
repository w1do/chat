<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Redis;
use Vendor\Chat\Infrastructure\Presence\RedisPresenceRegistry;

/**
 * Интеграционные тесты против реального Redis (dev Compose стек).
 * TTL-семантика — источник истины для правила «не уведомлять активного».
 */
beforeEach(function (): void {
    try {
        Redis::connection()->ping();
    } catch (Throwable) {
        $this->markTestSkipped('Redis недоступен: поднимите dev-стек (docker compose -f infra/compose/compose.dev.yaml up -d redis).');
    }

    $this->registry = new RedisPresenceRegistry(app('redis'), prefix: 'test:presence:'.uniqid());
});

it('detects active users in a room and cleans up on explicit leave', function (): void {
    $this->registry->markActive('room-1', 'user-a', ttlSeconds: 60);
    $this->registry->markActive('room-1', 'user-b', ttlSeconds: 60);

    expect($this->registry->isActiveInRoom('room-1', 'user-a'))->toBeTrue()
        ->and($this->registry->activeUserIds('room-1'))->toContain('user-a', 'user-b')
        ->and($this->registry->isActiveInRoom('room-2', 'user-a'))->toBeFalse();

    $this->registry->markInactive('room-1', 'user-a');
    expect($this->registry->isActiveInRoom('room-1', 'user-a'))->toBeFalse()
        ->and($this->registry->activeUserIds('room-1'))->toBe(['user-b']);
});

it('expires presence by TTL when the client disconnects silently', function (): void {
    $this->registry->markActive('room-1', 'ghost', ttlSeconds: 1);

    expect($this->registry->isActiveInRoom('room-1', 'ghost'))->toBeTrue();

    usleep(1_200_000);

    expect($this->registry->isActiveInRoom('room-1', 'ghost'))->toBeFalse()
        ->and($this->registry->activeUserIds('room-1'))->toBe([]);
});

it('expires typing state by its own shorter TTL', function (): void {
    $this->registry->markTyping('room-1', 'typer', ttlSeconds: 1);
    $this->registry->markActive('room-1', 'typer', ttlSeconds: 60);

    expect($this->registry->typingUserIds('room-1'))->toBe(['typer']);

    usleep(1_200_000);

    // Набор истёк, присутствие — ещё нет.
    expect($this->registry->typingUserIds('room-1'))->toBe([])
        ->and($this->registry->isActiveInRoom('room-1', 'typer'))->toBeTrue();
});

it('stops typing explicitly when the user sends the message', function (): void {
    $this->registry->markTyping('room-1', 'typer', ttlSeconds: 60);
    $this->registry->stopTyping('room-1', 'typer');

    expect($this->registry->typingUserIds('room-1'))->toBe([]);
});
