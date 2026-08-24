<?php

declare(strict_types=1);

namespace Vendor\Identity\Application\DTOs;

use Vendor\Identity\Domain\Models\User;

final readonly class UserData
{
    public function __construct(
        public string $id,
        public string $name,
        public string $email,
        public string $locale,
        public string $timezone,
        public ?string $emailVerifiedAt,
        public string $createdAt,
    ) {}

    public static function fromModel(User $user): self
    {
        return new self(
            id: $user->externalId(),
            name: (string) $user->name,
            email: (string) $user->email,
            locale: (string) $user->locale,
            timezone: (string) $user->timezone,
            emailVerifiedAt: $user->email_verified_at?->toIso8601String(),
            createdAt: (string) $user->created_at?->toIso8601String(),
        );
    }
}
