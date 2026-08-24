<?php

declare(strict_types=1);

namespace Vendor\Identity\Domain\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Carbon;
use Laravel\Sanctum\HasApiTokens;
use Vendor\Identity\Database\Factories\UserFactory;
use Vendor\SharedKernel\Contracts\Actor;

/**
 * Базовая модель пользователя.
 *
 * @property string $id
 * @property string $username
 * @property string $name
 * @property ?string $email
 * @property string $locale
 * @property string $timezone
 * @property ?Carbon $email_verified_at
 * @property ?Carbon $created_at
 * @property string $password
 *                            Приложение наследует её в App\Models\User
 *                            и подставляет класс через config('identity.user_model') (STRUCTURE.md §2);
 *                            другие пакеты зависят только от контракта Actor.
 */
class User extends Authenticatable implements Actor
{
    use HasApiTokens;

    /** @use HasFactory<UserFactory> */
    use HasFactory;

    use HasUlids;
    use Notifiable;

    protected $table = 'users';

    protected $fillable = [
        'username',
        'name',
        'email',
        'password',
        'locale',
        'timezone',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    public function externalId(): string
    {
        return (string) $this->getKey();
    }

    public function displayName(): string
    {
        return (string) $this->name;
    }

    protected static function newFactory(): UserFactory
    {
        return UserFactory::new();
    }
}
