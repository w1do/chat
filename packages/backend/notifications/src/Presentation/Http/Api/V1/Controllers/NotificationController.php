<?php

declare(strict_types=1);

namespace Vendor\Notifications\Presentation\Http\Api\V1\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Vendor\Notifications\Application\Commands\MarkNotificationsReadCommand;
use Vendor\Notifications\Application\Handlers\Commands\MarkNotificationsReadHandler;
use Vendor\Notifications\Application\Handlers\Queries\ListNotificationsHandler;
use Vendor\Notifications\Application\Queries\ListNotificationsQuery;
use Vendor\Notifications\Presentation\Http\Api\V1\Requests\MarkReadRequest;
use Vendor\Notifications\Presentation\Http\Api\V1\Resources\NotificationResource;

final class NotificationController
{
    public function index(Request $request, ListNotificationsHandler $handler): JsonResponse
    {
        $result = $handler->handle(new ListNotificationsQuery(
            userId: (string) $request->user()->getAuthIdentifier(),
            unreadOnly: $request->boolean('unread'),
            limit: (int) $request->query('limit', '30'),
        ));

        return new JsonResponse([
            'data' => NotificationResource::collection($result['items'])->resolve($request),
            'meta' => ['unread' => $result['unread']],
        ]);
    }

    public function markRead(MarkReadRequest $request, MarkNotificationsReadHandler $handler): JsonResponse
    {
        $marked = $handler->handle(new MarkNotificationsReadCommand(
            userId: (string) $request->user()->getAuthIdentifier(),
            ids: $request->validated()['ids'] ?? null,
        ));

        return new JsonResponse(['data' => ['marked' => $marked]]);
    }
}
