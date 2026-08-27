<?php

declare(strict_types=1);

namespace Vendor\Identity\Application\Support;

use Illuminate\Contracts\Config\Repository;
use InvalidArgumentException;

final readonly class BrowserTokenConfig
{
    public function __construct(
        private Repository $config,
    ) {}

    public function enabled(): bool
    {
        return (bool) $this->config->get('identity.browser_token.enabled', true);
    }

    public function cookieName(): string
    {
        return (string) $this->config->get('identity.browser_token.cookie', '__Host-chat_browser_token');
    }

    public function ability(): string
    {
        return (string) $this->config->get('identity.browser_token.ability', 'browser');
    }

    public function ttlMinutes(bool $remember): int
    {
        $key = $remember ? 'remember_ttl_minutes' : 'ttl_minutes';

        return max(1, (int) $this->config->get("identity.browser_token.{$key}", $remember ? 43200 : 1440));
    }

    public function secure(): bool
    {
        return (bool) $this->config->get('identity.browser_token.secure', true);
    }

    public function sameSite(): string
    {
        $sameSite = strtolower((string) $this->config->get('identity.browser_token.same_site', 'lax'));

        return in_array($sameSite, ['lax', 'strict', 'none'], true) ? $sameSite : 'lax';
    }

    public function path(): string
    {
        return (string) $this->config->get('identity.browser_token.path', '/');
    }

    public function domain(): ?string
    {
        $domain = $this->config->get('identity.browser_token.domain');

        return is_string($domain) && $domain !== '' ? $domain : null;
    }

    public function assertSafe(): void
    {
        if (str_starts_with($this->cookieName(), '__Host-') && ($this->domain() !== null || $this->path() !== '/')) {
            throw new InvalidArgumentException('__Host- browser token cookies must be host-only and use Path=/.');
        }
    }
}
