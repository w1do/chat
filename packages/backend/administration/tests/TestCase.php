<?php

declare(strict_types=1);

namespace Vendor\Administration\Tests;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Gate;
use Laravel\Sanctum\SanctumServiceProvider;
use Orchestra\Testbench\TestCase as TestbenchTestCase;
use Vendor\Administration\AdministrationServiceProvider;
use Vendor\Administration\Domain\Enums\Ability;
use Vendor\Identity\Domain\Models\User;
use Vendor\Identity\IdentityServiceProvider;

abstract class TestCase extends TestbenchTestCase
{
    use RefreshDatabase;

    protected function getPackageProviders($app): array
    {
        return [
            SanctumServiceProvider::class,
            IdentityServiceProvider::class,
            AdministrationServiceProvider::class,
        ];
    }

    protected function defineEnvironment($app): void
    {
        $app['config']->set('app.key', 'base64:'.base64_encode(random_bytes(32)));
        $app['config']->set('database.default', 'testing');
        $app['config']->set('session.driver', 'array');
        $app['config']->set('cache.default', 'array');
        $app['config']->set('administration.routes.middleware', ['web']);
        $app['config']->set('identity.routes.enabled', false);
    }

    /**
     * Источник прав — приложение; в изоляции роль администратора описываем
     * простым признаком на пользователе.
     *
     * @param  list<Ability>  $abilities
     */
    protected function actingAsAdmin(array $abilities = []): User
    {
        $granted = $abilities === [] ? Ability::cases() : $abilities;

        foreach (Ability::cases() as $ability) {
            Gate::define($ability->value, static fn (User $user): bool => in_array($ability, $granted, true)
                && $user->username === 'admin');
        }

        $admin = User::factory()->create(['username' => 'admin']);
        $this->actingAs($admin);

        return $admin;
    }

    protected function actingAsMember(): User
    {
        foreach (Ability::cases() as $ability) {
            Gate::define($ability->value, static fn (User $user): bool => $user->username === 'admin');
        }

        $member = User::factory()->create(['username' => 'member']);
        $this->actingAs($member);

        return $member;
    }
}
