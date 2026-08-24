<?php

declare(strict_types=1);

namespace Vendor\Identity\Presentation\Http\Api\V1\Controllers;

use Illuminate\Http\Response;
use Vendor\Identity\Application\Commands\ChangePasswordCommand;
use Vendor\Identity\Application\Commands\UpdateEmailCommand;
use Vendor\Identity\Application\Commands\UpdateProfileCommand;
use Vendor\Identity\Application\Handlers\Commands\ChangePasswordHandler;
use Vendor\Identity\Application\Handlers\Commands\UpdateEmailHandler;
use Vendor\Identity\Application\Handlers\Commands\UpdateProfileHandler;
use Vendor\Identity\Presentation\Http\Api\V1\Requests\ChangePasswordRequest;
use Vendor\Identity\Presentation\Http\Api\V1\Requests\UpdateEmailRequest;
use Vendor\Identity\Presentation\Http\Api\V1\Requests\UpdateProfileRequest;
use Vendor\Identity\Presentation\Http\Api\V1\Resources\UserResource;

final class ProfileController
{
    public function update(UpdateProfileRequest $request, UpdateProfileHandler $handler): UserResource
    {
        $validated = $request->validated();

        return UserResource::make($handler->handle(new UpdateProfileCommand(
            userId: (string) $request->user()->getKey(),
            name: $validated['name'] ?? null,
            locale: $validated['locale'] ?? null,
            timezone: $validated['timezone'] ?? null,
        )));
    }

    public function updateEmail(UpdateEmailRequest $request, UpdateEmailHandler $handler): UserResource
    {
        return UserResource::make($handler->handle(new UpdateEmailCommand(
            userId: (string) $request->user()->getKey(),
            email: $request->validated()['email'],
        )));
    }

    public function changePassword(ChangePasswordRequest $request, ChangePasswordHandler $handler): Response
    {
        $validated = $request->validated();

        $handler->handle(new ChangePasswordCommand(
            userId: (string) $request->user()->getKey(),
            currentPassword: $validated['current_password'],
            newPassword: $validated['password'],
        ));

        return response()->noContent();
    }
}
