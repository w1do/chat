<?php

declare(strict_types=1);

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Vendor\Administration\Domain\Enums\Ability;
use Vendor\Administration\Domain\Models\AuditLog;
use Vendor\Administration\Domain\Models\SystemSetting;
use Vendor\Ai\Domain\Contracts\TextRevisionProvider;
use Vendor\Ai\Testing\FakeTextRevisionProvider;

uses(RefreshDatabase::class);

function superAdmin(): User
{
    $user = User::factory()->create();
    $user->assignRole(Role::findOrCreate('super-admin', User::GUARD));

    return $user;
}

it('gives the super-admin role every administration ability', function (): void {
    $this->actingAs(superAdmin())
        ->getJson('/api/v1/admin/status')
        ->assertOk()
        ->assertJsonStructure(['data' => ['components', 'features', 'version']]);
});

it('grants a single ability without the whole role', function (): void {
    $auditor = User::factory()->create();
    $auditor->givePermissionTo(Permission::findOrCreate(Ability::ViewAudit->value, User::GUARD));

    $this->actingAs($auditor)->getJson('/api/v1/admin/audit-logs')->assertOk();
    $this->getJson('/api/v1/admin/status')->assertStatus(403);
});

it('forbids administration to an ordinary user', function (): void {
    $this->actingAs(User::factory()->create())->getJson('/api/v1/admin/status')->assertStatus(403);
});

it('requires authentication for administration', function (): void {
    $this->getJson('/api/v1/admin/audit-logs')->assertStatus(401);
});

it('disables AI at runtime while ordinary chat keeps working', function (): void {
    config()->set('ai.enabled', true);
    app()->instance(TextRevisionProvider::class, new FakeTextRevisionProvider(suggestion: 'Так понятнее'));

    $admin = superAdmin();

    $this->actingAs($admin)->patchJson('/api/v1/admin/settings', ['ai_enabled' => false])
        ->assertOk()
        ->assertJsonPath('data.ai_enabled', false);

    expect(SystemSetting::query()->whereKey('ai.enabled')->value('value'))->toBeFalse();

    // Помощник отвечает документированным отказом…
    $this->actingAs($admin)->postJson('/api/v1/ai/message-revisions', [
        'operation' => 'clarify',
        'text' => 'привет как дела',
    ])->assertStatus(503);

    // …а обычная переписка продолжает работать.
    $this->actingAs($admin)->postJson('/api/v1/rooms', ['name' => 'Общая', 'visibility' => 'public'])
        ->assertCreated();
});

it('records AI use in the audit log without the draft or the suggestion', function (): void {
    config()->set('ai.enabled', true);
    app()->instance(TextRevisionProvider::class, new FakeTextRevisionProvider(suggestion: 'Так понятнее'));

    $user = User::factory()->create();

    $this->actingAs($user)->postJson('/api/v1/ai/message-revisions', [
        'operation' => 'clarify',
        'text' => 'секретный черновик пользователя',
    ])->assertOk();

    $entry = AuditLog::query()->where('action', 'ai.revision.succeeded')->sole();

    expect($entry->actor_id)->toBe((string) $user->getKey())
        ->and($entry->context['operation'])->toBe('clarify')
        ->and(json_encode($entry->context, JSON_UNESCAPED_UNICODE))
        ->not->toContain('секретный черновик')
        ->not->toContain('Так понятнее');
});

it('shows the administrative change itself in the audit log', function (): void {
    $admin = superAdmin();

    $this->actingAs($admin)->patchJson('/api/v1/admin/settings', ['ai_enabled' => true])->assertOk();

    $this->actingAs($admin)->getJson('/api/v1/admin/audit-logs')
        ->assertOk()
        ->assertJsonPath('data.0.action', 'administration.settings.updated')
        ->assertJsonPath('data.0.actor_id', (string) $admin->getKey());
});

it('keeps the Horizon dashboard away from non-admins', function (): void {
    $this->actingAs(User::factory()->create())->get('/horizon/api/stats')->assertStatus(403);
});

it('opens the Horizon dashboard to an administrator', function (): void {
    $this->actingAs(superAdmin())->get('/horizon/api/stats')->assertSuccessful();
});
