<?php

declare(strict_types=1);

use Vendor\Administration\Domain\Contracts\AuditRecorder;
use Vendor\Administration\Domain\Contracts\SystemProbe;
use Vendor\Administration\Domain\Enums\Ability;

beforeEach(function (): void {
    // Состояние зависимостей приходит от приложения — в изоляции подменяем.
    app()->instance(SystemProbe::class, new class implements SystemProbe
    {
        public function components(): array
        {
            return [
                'database' => ['status' => 'ok'],
                'queue' => ['status' => 'ok'],
                'websocket' => ['status' => 'fail', 'detail' => 'reverb is not running'],
                'search' => ['status' => 'ok'],
            ];
        }
    });
});

it('shows system status to an administrator', function (): void {
    $this->actingAsAdmin();

    $this->getJson('/api/v1/admin/status')
        ->assertOk()
        ->assertJsonPath('data.components.websocket.status', 'fail')
        ->assertJsonPath('data.features.ai', false);
});

it('lets an administrator switch AI off and on', function (): void {
    $this->actingAsAdmin();

    $this->patchJson('/api/v1/admin/settings', ['ai_enabled' => true])
        ->assertOk()
        ->assertJsonPath('data.ai_enabled', true);

    $this->getJson('/api/v1/admin/settings')->assertOk()->assertJsonPath('data.ai_enabled', true);

    $this->patchJson('/api/v1/admin/settings', ['ai_enabled' => false])
        ->assertOk()
        ->assertJsonPath('data.ai_enabled', false);
});

it('lists audit records for an administrator', function (): void {
    app(AuditRecorder::class)->record(action: 'administration.settings.updated', actorId: 'u1', actorLabel: 'Алиса');
    $this->actingAsAdmin();

    $this->getJson('/api/v1/admin/audit-logs')
        ->assertOk()
        ->assertJsonPath('data.0.action', 'administration.settings.updated')
        ->assertJsonPath('data.0.actor_label', 'Алиса')
        ->assertJsonPath('meta.next_cursor', null);
});

it('forbids every admin endpoint to an ordinary member', function (): void {
    $this->actingAsMember();

    $this->getJson('/api/v1/admin/status')->assertStatus(403);
    $this->getJson('/api/v1/admin/settings')->assertStatus(403);
    $this->patchJson('/api/v1/admin/settings', ['ai_enabled' => true])->assertStatus(403);
    $this->getJson('/api/v1/admin/audit-logs')->assertStatus(403);
});

it('separates the settings permission from the read-only one', function (): void {
    // Право смотреть не даёт права менять.
    $this->actingAsAdmin([Ability::ViewSystem]);

    $this->getJson('/api/v1/admin/status')->assertOk();
    $this->patchJson('/api/v1/admin/settings', ['ai_enabled' => true])->assertStatus(403);
});

it('requires authentication', function (): void {
    $this->getJson('/api/v1/admin/status')->assertStatus(401);
    $this->getJson('/api/v1/admin/audit-logs')->assertStatus(401);
});

it('validates the settings payload', function (): void {
    $this->actingAsAdmin();

    $this->patchJson('/api/v1/admin/settings', ['ai_enabled' => 'maybe'])->assertStatus(422);
});
