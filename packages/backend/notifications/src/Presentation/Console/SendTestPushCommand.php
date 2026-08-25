<?php

declare(strict_types=1);

namespace Vendor\Notifications\Presentation\Console;

use Illuminate\Console\Command;
use Throwable;
use Vendor\Notifications\Domain\Enums\Category;
use Vendor\Notifications\Domain\Models\PushSubscription;
use Vendor\Notifications\Infrastructure\Push\WebPushSender;

/**
 * Проверка push «здесь и сейчас»: отправляет тестовое уведомление на все
 * устройства пользователя и объясняет, что пошло не так.
 */
final class SendTestPushCommand extends Command
{
    protected $signature = 'chat:push-test {login : Логин получателя}';

    protected $description = 'Send a test push notification to every device of a user';

    public function handle(WebPushSender $sender): int
    {
        if (! $sender->isConfigured()) {
            $this->error('Push выключены: не заданы VAPID_PUBLIC_KEY и VAPID_PRIVATE_KEY.');
            $this->line('Сгенерировать пару: php artisan chat:push-keys');

            return self::FAILURE;
        }

        $userModel = config('auth.providers.users.model');
        $user = $userModel::query()->where('username', $this->argument('login'))->first();

        if ($user === null) {
            $this->error('Пользователь с таким логином не найден.');

            return self::FAILURE;
        }

        $devices = PushSubscription::query()->where('user_id', $user->getKey())->count();

        if ($devices === 0) {
            $this->warn('У пользователя нет подписанных устройств.');
            $this->line('Включите тумблер «Push-уведомления» в настройках чата на самом устройстве.');

            return self::FAILURE;
        }

        try {
            $delivered = $sender->send((string) $user->getKey(), Category::Security, [
                'room_name' => 'Проверка',
                'actor_name' => 'Сервер',
                'preview' => 'Если вы это видите, push работают.',
            ]);
        } catch (Throwable $exception) {
            $this->error('Push-сервис отклонил отправку: '.$exception->getMessage());

            return self::FAILURE;
        }

        $this->info("Отправлено устройств: {$delivered} из {$devices}.");

        if ($delivered < $devices) {
            $this->line('Недоставленные подписки были аннулированы браузером и удалены.');
        }

        return self::SUCCESS;
    }
}
