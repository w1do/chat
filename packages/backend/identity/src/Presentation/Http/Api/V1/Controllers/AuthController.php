<?php

declare(strict_types=1);

namespace Vendor\Identity\Presentation\Http\Api\V1\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Symfony\Component\HttpFoundation\Cookie;
use Vendor\Identity\Application\Commands\LoginCommand;
use Vendor\Identity\Application\Commands\LogoutCommand;
use Vendor\Identity\Application\Commands\RegisterUserCommand;
use Vendor\Identity\Application\Commands\RequestPasswordResetCommand;
use Vendor\Identity\Application\Commands\ResetPasswordCommand;
use Vendor\Identity\Application\DTOs\AuthenticatedUserData;
use Vendor\Identity\Application\Handlers\Commands\LoginHandler;
use Vendor\Identity\Application\Handlers\Commands\LogoutHandler;
use Vendor\Identity\Application\Handlers\Commands\RegisterUserHandler;
use Vendor\Identity\Application\Handlers\Commands\RequestPasswordResetHandler;
use Vendor\Identity\Application\Handlers\Commands\ResetPasswordHandler;
use Vendor\Identity\Application\Support\BrowserTokenConfig;
use Vendor\Identity\Presentation\Http\Api\V1\Requests\ForgotPasswordRequest;
use Vendor\Identity\Presentation\Http\Api\V1\Requests\LoginRequest;
use Vendor\Identity\Presentation\Http\Api\V1\Requests\RegisterRequest;
use Vendor\Identity\Presentation\Http\Api\V1\Requests\ResetPasswordRequest;
use Vendor\Identity\Presentation\Http\Api\V1\Resources\UserResource;

final class AuthController
{
    public function register(RegisterRequest $request, RegisterUserHandler $handler): JsonResponse
    {
        $validated = $request->validated();

        $result = $handler->handle(new RegisterUserCommand(
            username: $validated['login'],
            password: $validated['password'],
            name: $validated['name'] ?? null,
        ));

        if ($request->hasSession()) {
            $request->session()->regenerate();
        }

        return $this->withBrowserTokenCookie(
            UserResource::make($result->user)->response()->setStatusCode(201),
            $result,
        );
    }

    public function login(LoginRequest $request, LoginHandler $handler): JsonResponse
    {
        $validated = $request->validated();

        $result = $handler->handle(new LoginCommand(
            username: $validated['login'],
            password: $validated['password'],
            remember: (bool) ($validated['remember'] ?? false),
        ));

        if ($request->hasSession()) {
            $request->session()->regenerate();
        }

        return $this->withBrowserTokenCookie(UserResource::make($result->user)->response(), $result);
    }

    public function logout(Request $request, LogoutHandler $handler, BrowserTokenConfig $browserTokenConfig): Response
    {
        $handler->handle(new LogoutCommand(currentAccessTokenId: $request->user()?->currentAccessToken()?->getKey()));

        if ($request->hasSession()) {
            $request->session()->invalidate();
            $request->session()->regenerateToken();
        }

        $response = response()->noContent();
        $response->headers->clearCookie(
            name: $browserTokenConfig->cookieName(),
            path: $browserTokenConfig->path(),
            domain: $browserTokenConfig->domain(),
            secure: $browserTokenConfig->secure(),
            httpOnly: true,
            sameSite: $browserTokenConfig->sameSite(),
        );

        return $response;
    }

    public function forgotPassword(ForgotPasswordRequest $request, RequestPasswordResetHandler $handler): JsonResponse
    {
        $handler->handle(new RequestPasswordResetCommand(email: $request->validated()['email']));

        // Ответ одинаков для существующего и несуществующего email.
        return new JsonResponse(['message' => 'If the email exists, a reset link has been sent.'], 202);
    }

    public function resetPassword(ResetPasswordRequest $request, ResetPasswordHandler $handler): Response
    {
        $validated = $request->validated();

        $handler->handle(new ResetPasswordCommand(
            email: $validated['email'],
            token: $validated['token'],
            password: $validated['password'],
        ));

        return response()->noContent();
    }

    private function withBrowserTokenCookie(JsonResponse $response, AuthenticatedUserData $result): JsonResponse
    {
        if ($result->browserTokenCookie === null) {
            return $response;
        }

        $cookie = $result->browserTokenCookie;
        $response->headers->setCookie(new Cookie(
            name: $cookie->name,
            value: $cookie->plainTextToken,
            expire: $cookie->expiresAt,
            path: $cookie->path,
            domain: $cookie->domain,
            secure: $cookie->secure,
            httpOnly: true,
            raw: false,
            sameSite: $cookie->sameSite,
        ));

        return $response;
    }
}
