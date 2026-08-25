<?php

declare(strict_types=1);

namespace Vendor\Chat\Presentation\Http\Api\V1\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;
use Vendor\Chat\Application\Commands\CreateInviteCommand;
use Vendor\Chat\Application\Handlers\Commands\CreateInviteHandler;
use Vendor\Chat\Application\Handlers\Commands\RevokeInviteHandler;
use Vendor\Chat\Application\Handlers\Queries\GetInviteHandler;
use Vendor\Chat\Application\Queries\GetInviteQuery;
use Vendor\Chat\Domain\Models\Room;
use Vendor\Chat\Domain\Models\RoomInvite;
use Vendor\Chat\Presentation\Http\Api\V1\Resources\InviteResource;

final class InviteController
{
    /** Ссылку создаёт любой участник комнаты. */
    public function store(Request $request, Room $room, CreateInviteHandler $handler): JsonResponse
    {
        Gate::authorize('view', $room);

        $invite = $handler->handle(new CreateInviteCommand(
            roomId: $room->id,
            userId: (string) $request->user()->getAuthIdentifier(),
        ));

        return InviteResource::make($invite)->response()->setStatusCode(201);
    }

    public function destroy(Request $request, RoomInvite $invite, RevokeInviteHandler $handler): Response
    {
        $room = Room::query()->findOrFail($invite->room_id);
        Gate::authorize('view', $room);

        $handler->handle($invite->id);

        return response()->noContent();
    }

    /** Сведения о приглашении: доступны без входа — по ним человек решает, идти ли. */
    public function show(string $token, GetInviteHandler $handler): JsonResponse
    {
        return InviteResource::make($handler->handle(new GetInviteQuery($token)))->response();
    }
}
