<?php

declare(strict_types=1);

namespace Vendor\Identity\Presentation\Http\Middleware;

use Closure;
use DateTimeInterface;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Laravel\Sanctum\PersonalAccessToken;
use Symfony\Component\HttpFoundation\Response;
use Vendor\Identity\Application\Support\BrowserTokenConfig;
use Vendor\Identity\Domain\Models\User;

final readonly class UseBrowserTokenCookie
{
    public function __construct(private BrowserTokenConfig $config) {}

    /**
     * @param  Closure(Request): Response  $next
     *
     * @throws AuthenticationException
     */
    public function handle(Request $request, Closure $next): Response
    {
        if ($this->config->enabled() && $request->user() === null) {
            $token = $request->cookies->get($this->config->cookieName());

            if (is_string($token) && $token !== '') {
                $accessToken = PersonalAccessToken::findToken($token);

                if ($accessToken !== null
                    && $accessToken->can($this->config->ability())
                    && ! $this->hasExpired($accessToken)
                ) {
                    $this->authenticate($request, $accessToken);
                }
            }
        }

        if ($request->user() === null) {
            throw new AuthenticationException;
        }

        return $next($request);
    }

    /**
     * Владельцем токена может быть любая модель, а к моменту запроса её могли и
     * удалить. Входим только тем, кого действительно можно сделать текущим
     * пользователем и пометить этим токеном.
     */
    private function authenticate(Request $request, PersonalAccessToken $accessToken): void
    {
        $user = $accessToken->tokenable;

        if (! $user instanceof User) {
            return;
        }

        $user->withAccessToken($accessToken);
        Auth::setUser($user);
        $request->setUserResolver(fn () => $user);
    }

    /** Срок жизни лежит атрибутом модели Sanctum; токен без срока бессрочен. */
    private function hasExpired(PersonalAccessToken $accessToken): bool
    {
        $expiresAt = $accessToken->getAttribute('expires_at');

        return $expiresAt instanceof DateTimeInterface && $expiresAt->getTimestamp() <= now()->getTimestamp();
    }
}
