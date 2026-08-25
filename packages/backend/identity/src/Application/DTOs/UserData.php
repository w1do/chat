<?php

declare(strict_types=1);

namespace Vendor\Identity\Application\DTOs;

use Vendor\Identity\Application\Support\AvatarUrl;
use Vendor\Identity\Domain\Models\User;

final readonly class UserData
{
    public function __construct(
        public string $id,
        public string $username,
        public string $name,
        public ?string $email,
        public string $locale,
        public string $timezone,
        public ?string $emailVerifiedAt,
        public string $createdAt,
        /** Пароль выбрал сам человек, а не система (аккаунт по приглашению). */
        public bool $passwordSet = true,
        /** Мелкий размер для списков и лент; null — аватарки нет. */
        public ?string $avatarUrl = null,
        /** Крупный размер для экрана профиля. */
        public ?string $avatarLargeUrl = null,
        /** Личные обои переписки; видны только владельцу. */
        public ?string $wallpaperUrl = null,
    ) {}

    public static function fromModel(User $user): self
    {
        return new self(
            id: $user->externalId(),
            username: (string) $user->username,
            name: (string) $user->name,
            email: $user->email,
            locale: (string) $user->locale,
            timezone: (string) $user->timezone,
            emailVerifiedAt: $user->email_verified_at?->toIso8601String(),
            createdAt: (string) $user->created_at?->toIso8601String(),
            passwordSet: $user->password_set_at !== null,
            avatarUrl: AvatarUrl::thumb($user),
            avatarLargeUrl: AvatarUrl::large($user),
            wallpaperUrl: AvatarUrl::wallpaper($user),
        );
    }
}
