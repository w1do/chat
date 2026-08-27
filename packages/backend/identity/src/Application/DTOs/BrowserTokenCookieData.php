<?php

declare(strict_types=1);

namespace Vendor\Identity\Application\DTOs;

use Illuminate\Support\Carbon;

final readonly class BrowserTokenCookieData
{
    public function __construct(
        public string $name,
        public string $plainTextToken,
        public Carbon $expiresAt,
        public bool $secure,
        public string $sameSite,
        public string $path,
        public ?string $domain,
    ) {}

    public function maxAgeMinutes(): int
    {
        return max(1, now()->diffInMinutes($this->expiresAt, false));
    }
}
