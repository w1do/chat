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
use Vendor\Identity\Application\Handlers\Commands\LoginHandler;
use Vendor\Identity\Application\Handlers\Commands\LogoutHandler;
use Vendor\Identity\Application\Handlers\Commands\RegisterUserHandler;
use Vendor\Identity\Application\Handlers\Commands\RequestPasswordResetHandler;
use Vendor\Identity\Application\Handlers\Commands\ResetPasswordHandler;
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

        $user = $handler->handle(new RegisterUserCommand(
            name: $validated['name'],
            email: $validated['email'],
            password: $validated['password'],
        ));

        if ($request->hasSession()) {
            $request->session()->regenerate();
        }

        return UserResource::make($user)->response()->setStatusCode(201);
    }

    public function login(LoginRequest $request, LoginHandler $handler): UserResource
    {
        $validated = $request->validated();

        $user = $handler->handle(new LoginCommand(
            email: $validated['email'],
            password: $validated['password'],
            remember: (bool) ($validated['remember'] ?? false),
        ));

        if ($request->hasSession()) {
            $request->session()->regenerate();
        }

        return UserResource::make($user);
    }

    public function logout(Request $request, LogoutHandler $handler): Response
    {
        $handler->handle(new LogoutCommand);

        if ($request->hasSession()) {
            $request->session()->invalidate();
            $request->session()->regenerateToken();
        }

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
}
