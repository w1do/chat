<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Vendor\Administration\Domain\Enums\Ability;

/** Первый администратор self-hosted установки назначается из консоли. */
final class GrantAdminCommand extends Command
{
    protected $signature = 'chat:grant-admin {login : Логин пользователя}';

    protected $description = 'Grant the super-admin role to a user';

    public function handle(): int
    {
        $user = User::query()->where('username', $this->argument('login'))->first();

        if ($user === null) {
            $this->error('Пользователь с таким логином не найден.');

            return self::FAILURE;
        }

        // Guard задаём явно: во время запроса API текущим guard'ом становится
        // sanctum, и роль без явного guard создалась бы под ним.
        $role = Role::findOrCreate('super-admin', User::GUARD);

        foreach (Ability::all() as $ability) {
            $role->givePermissionTo(Permission::findOrCreate($ability, User::GUARD));
        }

        $user->assignRole($role);

        $this->info("Пользователь {$user->username} теперь super-admin.");

        return self::SUCCESS;
    }
}
