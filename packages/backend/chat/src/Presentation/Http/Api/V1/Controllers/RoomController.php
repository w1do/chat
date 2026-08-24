<?php

declare(strict_types=1);

namespace Vendor\Chat\Presentation\Http\Api\V1\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;
use Vendor\Chat\Application\Commands\ArchiveRoomCommand;
use Vendor\Chat\Application\Commands\CreateRoomCommand;
use Vendor\Chat\Application\Commands\UpdateRoomCommand;
use Vendor\Chat\Application\Handlers\Commands\ArchiveRoomHandler;
use Vendor\Chat\Application\Handlers\Commands\CreateRoomHandler;
use Vendor\Chat\Application\Handlers\Commands\UpdateRoomHandler;
use Vendor\Chat\Application\Handlers\Queries\GetRoomHandler;
use Vendor\Chat\Application\Handlers\Queries\ListRoomsHandler;
use Vendor\Chat\Application\Queries\GetRoomQuery;
use Vendor\Chat\Application\Queries\ListRoomsQuery;
use Vendor\Chat\Domain\Models\Room;
use Vendor\Chat\Presentation\Http\Api\V1\Requests\CreateRoomRequest;
use Vendor\Chat\Presentation\Http\Api\V1\Requests\UpdateRoomRequest;
use Vendor\Chat\Presentation\Http\Api\V1\Resources\RoomResource;

final class RoomController
{
    public function index(Request $request, ListRoomsHandler $handler): AnonymousResourceCollection
    {
        $rooms = $handler->handle(new ListRoomsQuery(
            visibility: $request->query('visibility'),
            search: $request->query('search'),
        ), $request->user());

        return RoomResource::collection($rooms);
    }

    public function store(CreateRoomRequest $request, CreateRoomHandler $handler): JsonResponse
    {
        $validated = $request->validated();

        $room = $handler->handle(new CreateRoomCommand(
            userId: (string) $request->user()->getAuthIdentifier(),
            name: $validated['name'],
            topic: $validated['topic'] ?? null,
            visibility: $validated['visibility'],
        ));

        return RoomResource::make($room)->response()->setStatusCode(201);
    }

    public function show(Request $request, Room $room, GetRoomHandler $handler): RoomResource
    {
        Gate::authorize('view', $room);

        return RoomResource::make($handler->handle(new GetRoomQuery($room->id), $request->user()));
    }

    public function update(UpdateRoomRequest $request, Room $room, UpdateRoomHandler $handler): RoomResource
    {
        Gate::authorize('update', $room);

        $validated = $request->validated();

        return RoomResource::make($handler->handle(new UpdateRoomCommand(
            roomId: $room->id,
            name: $validated['name'] ?? null,
            topic: $validated['topic'] ?? null,
        )));
    }

    public function destroy(Room $room, ArchiveRoomHandler $handler): Response
    {
        Gate::authorize('archive', $room);

        $handler->handle(new ArchiveRoomCommand($room->id));

        return response()->noContent();
    }
}
