<?php

declare(strict_types=1);

namespace Vendor\Notifications\Domain\Contracts;

/** Итог отправки: доставлено, подписки больше нет, или ошибка для повтора. */
final readonly class PushResult
{
    private function __construct(
        public bool $delivered,
        public bool $gone,
        public ?string $reason = null,
    ) {}

    public static function delivered(): self
    {
        return new self(delivered: true, gone: false);
    }

    /** Push-сервис ответил 404/410: браузер аннулировал подписку. */
    public static function gone(): self
    {
        return new self(delivered: false, gone: true);
    }

    public static function failed(?string $reason = null): self
    {
        return new self(delivered: false, gone: false, reason: $reason);
    }
}
