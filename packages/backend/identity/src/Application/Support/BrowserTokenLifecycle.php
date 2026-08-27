<?php

declare(strict_types=1);

namespace Vendor\Identity\Application\Support;

use Laravel\Sanctum\NewAccessToken;
use Vendor\Identity\Application\DTOs\BrowserTokenCookieData;
use Vendor\Identity\Domain\Models\User;

final readonly class BrowserTokenLifecycle
{
    public function __construct(private BrowserTokenConfig $config) {}

    public function issue(User $user, bool $remember): ?BrowserTokenCookieData
    {
        if (! $this->config->enabled()) {
            return null;
        }

        $this->config->assertSafe();

        $expiresAt = now()->addMinutes($this->config->ttlMinutes($remember));
        /** @var NewAccessToken $token */
        $token = $user->createToken('browser', [$this->config->ability()], $expiresAt);

        return new BrowserTokenCookieData(
            name: $this->config->cookieName(),
            plainTextToken: $token->plainTextToken,
            expiresAt: $expiresAt,
            secure: $this->config->secure(),
            sameSite: $this->config->sameSite(),
            path: $this->config->path(),
            domain: $this->config->domain(),
        );
    }
}
