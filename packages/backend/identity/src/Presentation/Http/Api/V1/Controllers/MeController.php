<?php

declare(strict_types=1);

namespace Vendor\Identity\Presentation\Http\Api\V1\Controllers;

use Illuminate\Http\Request;
use Vendor\Identity\Application\Handlers\Queries\GetMeHandler;
use Vendor\Identity\Application\Queries\GetMeQuery;
use Vendor\Identity\Presentation\Http\Api\V1\Resources\UserResource;

final class MeController
{
    public function show(Request $request, GetMeHandler $handler): UserResource
    {
        return UserResource::make(
            $handler->handle(new GetMeQuery(userId: (string) $request->user()->getKey())),
        );
    }
}
