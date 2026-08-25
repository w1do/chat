<?php

declare(strict_types=1);

namespace Vendor\Notifications\Presentation\Console;

use Illuminate\Console\Command;
use Minishlink\WebPush\VAPID;
use Throwable;

/** Пара ключей VAPID для Web Push: генерируется один раз при установке. */
final class GeneratePushKeysCommand extends Command
{
    protected $signature = 'chat:push-keys';

    protected $description = 'Generate a VAPID key pair for Web Push notifications';

    public function handle(): int
    {
        try {
            $keys = VAPID::createVapidKeys();
        } catch (Throwable $exception) {
            $this->error('Не удалось сгенерировать ключи: '.$exception::class);

            return self::FAILURE;
        }

        $this->info('Добавьте в .env установки:');
        $this->newLine();
        $this->line('VAPID_PUBLIC_KEY='.$keys['publicKey']);
        $this->line('VAPID_PRIVATE_KEY='.$keys['privateKey']);
        $this->line('VAPID_SUBJECT=mailto:admin@example.com');
        $this->newLine();
        // Смена ключей аннулирует существующие подписки (docs/security).
        $this->warn('Смена ключей отключает уже подписанные устройства: людям придётся включить push заново.');

        return self::SUCCESS;
    }
}
