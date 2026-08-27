<?php

declare(strict_types=1);

namespace Vendor\Identity\Presentation\Http\Middleware;

use Closure;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Laravel\Sanctum\PersonalAccessToken;
use Symfony\Component\HttpFoundation\Response;
use Vendor\Identity\Application\Support\BrowserTokenConfig;

final readonly class UseBrowserTokenCookie
{
    public function __construct(private BrowserTokenConfig $config) {}

    /**
     * @param  Closure(Request): Response  $next
     */
    /** @throws AuthenticationException */
    public function handle(Request $request, Closure $next): Response
    {
        if ($this->config->enabled() && $request->user() === null) {
            $token = $request->cookies->get($this->config->cookieName());

            if (is_string($token) && $token !== '') {
                $accessToken = PersonalAccessToken::findToken($token);

                if ($accessToken !== null
                    && $accessToken->can($this->config->ability())
                    && ($accessToken->expires_at === null || $accessToken->expires_at->isFuture())
                ) {
                    $user = $accessToken->tokenable;
                    $user?->withAccessToken($accessToken);
                    Auth::setUser($user);
                    $request->setUserResolver(fn () => $user);
                }
            }
        }

        if ($request->user() === null) {
            throw new AuthenticationException;
        }

        return $next($request);
    }
}
