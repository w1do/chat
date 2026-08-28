<?php

declare(strict_types=1);

namespace Vendor\Identity\Application\Handlers\Commands;

use Illuminate\Support\Str;
use Vendor\Identity\Application\Commands\CreateInvitedUserCommand;
use Vendor\Identity\Application\DTOs\AuthenticatedUserData;
use Vendor\Identity\Application\DTOs\UserData;
use Vendor\Identity\Domain\Models\User;
use Vendor\Identity\Infrastructure\Auth\UserModel;

/**
 * Аккаунт для приглашённого: логин и пароль выдаёт система, имя называет
 * человек. Пароль нигде не показывается — он существует, чтобы у аккаунта был
 * валидный хэш; свой пароль человек задаёт в настройках (`password_set_at`).
 */
final readonly class CreateInvitedUserHandler
{
    public function __construct(
        // Резолвер, а не базовая модель: приложение подставляет свой класс
        // пользователя, и именно его ждут политики и Gate (STRUCTURE.md §2).
        private UserModel $userModel,
    ) {}

    public function handle(CreateInvitedUserCommand $command): AuthenticatedUserData
    {
        $name = trim($command->name);

        /** @var User $user */
        $user = $this->userModel->query()->create([
            'username' => $this->uniqueLogin($name),
            'name' => $name,
            // Случайный пароль: человек его не знает и не должен знать.
            'password' => Str::random(32),
        ]);

        $user->refresh();

        return new AuthenticatedUserData(
            user: UserData::fromModel($user),
            // Приглашённый входит тем же способом, что и все: своего пароля он
            // не знает, поэтому токен — его единственный вход (ADR-012).
            token: $user->createToken('client', ['*'])->plainTextToken,
        );
    }

    /** Логин узнаваем: его человек увидит в настройках, когда решит поменять. */
    private function uniqueLogin(string $name): string
    {
        $base = Str::slug(Str::ascii($name), '-');
        $base = $base !== '' ? mb_substr($base, 0, 20) : 'gost';

        do {
            $login = $base.'-'.Str::lower(Str::random(4));
        } while ($this->userModel->query()->where('username', $login)->exists());

        return $login;
    }
}
