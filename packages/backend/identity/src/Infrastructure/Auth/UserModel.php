<?php

declare(strict_types=1);

namespace Vendor\Identity\Infrastructure\Auth;

use Illuminate\Contracts\Config\Repository;
use Illuminate\Database\Eloquent\Builder;
use Vendor\Identity\Domain\Models\User;

/** Резолвер конкретного класса пользователя (config('identity.user_model')). */
final readonly class UserModel
{
    public function __construct(private Repository $config) {}

    /** @return class-string<User> */
    public function className(): string
    {
        /** @var class-string<User> */
        return $this->config->get('identity.user_model') ?? User::class;
    }

    /** @return Builder<User> */
    public function query(): Builder
    {
        return $this->className()::query();
    }

    public function findOrFail(string $id): User
    {
        /** @var User */
        return $this->query()->findOrFail($id);
    }
}
