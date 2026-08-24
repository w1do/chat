<?php

declare(strict_types=1);

namespace Vendor\Identity\Presentation\Http\Api\V1\Controllers;

use Vendor\Identity\Application\Commands\UpdateProfileCommand;
use Vendor\Identity\Application\Handlers\Commands\UpdateProfileHandler;
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
}
