<?php

declare(strict_types=1);

namespace Vendor\Administration\Presentation\Http\Api\V1\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Vendor\Administration\Application\Commands\UpdateSettingsCommand;
use Vendor\Administration\Application\Handlers\Commands\UpdateSettingsHandler;
use Vendor\Administration\Application\Handlers\Queries\GetSettingsHandler;
use Vendor\Administration\Application\Handlers\Queries\GetSystemStatusHandler;
use Vendor\Administration\Application\Handlers\Queries\ListAuditHandler;
use Vendor\Administration\Application\Queries\ListAuditQuery;
use Vendor\Administration\Presentation\Http\Api\V1\Requests\UpdateSettingsRequest;
use Vendor\Administration\Presentation\Http\Api\V1\Resources\AuditEntryResource;

/** Тонкий контроллер: право проверяет middleware `can:`, работу делает handler. */
final class AdminController
{
    public function status(GetSystemStatusHandler $handler): JsonResponse
    {
        return new JsonResponse(['data' => $handler->handle()]);
    }

    public function settings(GetSettingsHandler $handler): JsonResponse
    {
        return new JsonResponse(['data' => ['ai_enabled' => $handler->handle()->aiEnabled]]);
    }

    public function updateSettings(UpdateSettingsRequest $request, UpdateSettingsHandler $handler): JsonResponse
    {
        $user = $request->user();

        $settings = $handler->handle(new UpdateSettingsCommand(
            aiEnabled: (bool) $request->validated()['ai_enabled'],
            actorId: (string) $user->getAuthIdentifier(),
            actorLabel: (string) ($user->name ?? ''),
        ));

        return new JsonResponse(['data' => ['ai_enabled' => $settings->aiEnabled]]);
    }

    public function audit(Request $request, ListAuditHandler $handler): JsonResponse
    {
        $page = $handler->handle(new ListAuditQuery(
            action: $request->query('action'),
            actorId: $request->query('actor_id'),
            cursor: $request->query('cursor'),
            limit: (int) $request->query('limit', '50'),
        ));

        return AuditEntryResource::collection($page['items'])
            ->additional(['meta' => ['next_cursor' => $page['nextCursor']]])
            ->response();
    }
}
