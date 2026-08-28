<?php

declare(strict_types=1);

namespace Vendor\Identity\Presentation\Http\Api\V1\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
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
use Vendor\Identity\Application\Support\CurrentAccessToken;
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

        return $this->authenticated($result, 201);
    }

    public function login(LoginRequest $request, LoginHandler $handler): JsonResponse
    {
        $validated = $request->validated();

        $result = $handler->handle(new LoginCommand(
            username: $validated['login'],
            password: $validated['password'],
        ));

        return $this->authenticated($result);
    }

    public function logout(Request $request, LogoutHandler $handler): Response
    {
        $handler->handle(new LogoutCommand(currentAccessTokenId: CurrentAccessToken::id($request)));

        return response()->noContent();
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

    /**
     * Ответ входа: пользователь в прежнем envelope и plaintext-токен рядом с
     * ним. Cookie не ставится — токен хранит и предъявляет клиент (ADR-012).
     */
    private function authenticated(AuthenticatedUserData $result, int $status = 200): JsonResponse
    {
        return UserResource::make($result->user)
            ->additional(['token' => $result->token])
            ->response()
            ->setStatusCode($status);
    }
}
