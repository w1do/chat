<?php

declare(strict_types=1);

namespace Vendor\Identity\Application\Handlers\Commands;

use Illuminate\Contracts\Auth\PasswordBrokerFactory;
use Vendor\Identity\Application\Commands\RequestPasswordResetCommand;

final readonly class RequestPasswordResetHandler
{
    public function __construct(private PasswordBrokerFactory $passwords) {}

    /**
     * Всегда завершается успешно: не раскрываем существование адреса
     * (защита от перечисления пользователей). Аккаунты без почты письма
     * не получают — интерфейс объясняет это отдельно (design 1b).
     */
    public function handle(RequestPasswordResetCommand $command): void
    {
        $this->passwords->broker()->sendResetLink(['email' => $command->email]);
    }
}
