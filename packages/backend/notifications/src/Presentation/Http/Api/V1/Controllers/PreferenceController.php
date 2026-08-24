<?php

declare(strict_types=1);

namespace Vendor\Notifications\Presentation\Http\Api\V1\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Vendor\Notifications\Application\Commands\UpdatePreferencesCommand;
use Vendor\Notifications\Application\Handlers\Commands\UpdatePreferencesHandler;
use Vendor\Notifications\Application\Handlers\Queries\GetPreferencesHandler;
use Vendor\Notifications\Application\Queries\GetPreferencesQuery;
use Vendor\Notifications\Presentation\Http\Api\V1\Requests\UpdatePreferencesRequest;

final class PreferenceController
{
    public function index(Request $request, GetPreferencesHandler $handler): JsonResponse
    {
        return new JsonResponse([
            'data' => $handler->handle(new GetPreferencesQuery((string) $request->user()->getAuthIdentifier())),
        ]);
    }

    public function update(
        UpdatePreferencesRequest $request,
        UpdatePreferencesHandler $update,
        GetPreferencesHandler $read,
    ): JsonResponse {
        $userId = (string) $request->user()->getAuthIdentifier();

        $update->handle(new UpdatePreferencesCommand($userId, $request->validated()['preferences']));

        return new JsonResponse(['data' => $read->handle(new GetPreferencesQuery($userId))]);
    }
}
