<?php

declare(strict_types=1);

namespace Vendor\Chat\Presentation\Http\Api\V1\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;
use Vendor\Chat\Application\Commands\ChangeMemberRoleCommand;
use Vendor\Chat\Application\Commands\InviteMemberCommand;
use Vendor\Chat\Application\Commands\JoinRoomCommand;
use Vendor\Chat\Application\Commands\LeaveRoomCommand;
use Vendor\Chat\Application\Commands\RemoveMemberCommand;
use Vendor\Chat\Application\Handlers\Commands\ChangeMemberRoleHandler;
use Vendor\Chat\Application\Handlers\Commands\InviteMemberHandler;
use Vendor\Chat\Application\Handlers\Commands\JoinRoomHandler;
use Vendor\Chat\Application\Handlers\Commands\LeaveRoomHandler;
use Vendor\Chat\Application\Handlers\Commands\RemoveMemberHandler;
use Vendor\Chat\Application\Handlers\Queries\ListMembersHandler;
use Vendor\Chat\Application\Handlers\Queries\SearchMemberCandidatesHandler;
use Vendor\Chat\Application\Queries\ListMembersQuery;
use Vendor\Chat\Application\Queries\SearchMemberCandidatesQuery;
use Vendor\Chat\Domain\Models\Room;
use Vendor\Chat\Domain\Models\RoomMember;
use Vendor\Chat\Presentation\Http\Api\V1\Requests\ChangeMemberRoleRequest;
use Vendor\Chat\Presentation\Http\Api\V1\Requests\InviteMemberRequest;
use Vendor\Chat\Presentation\Http\Api\V1\Requests\SearchMemberCandidatesRequest;
use Vendor\Chat\Presentation\Http\Api\V1\Resources\MemberCandidateResource;
use Vendor\Chat\Presentation\Http\Api\V1\Resources\MemberResource;

final class MemberController
{
    public function index(Room $room, ListMembersHandler $handler): AnonymousResourceCollection
    {
        Gate::authorize('viewMembers', [RoomMember::class, $room]);

        return MemberResource::collection($handler->handle(new ListMembersQuery($room->id)));
    }

    /** Кого можно позвать: спрашивает тот, кто и так вправе приглашать. */
    public function candidates(
        SearchMemberCandidatesRequest $request,
        Room $room,
        SearchMemberCandidatesHandler $handler,
    ): AnonymousResourceCollection {
        Gate::authorize('invite', [RoomMember::class, $room]);

        return MemberCandidateResource::collection($handler->handle(new SearchMemberCandidatesQuery(
            roomId: $room->id,
            term: (string) ($request->validated()['query'] ?? ''),
        )));
    }

    public function store(InviteMemberRequest $request, Room $room, InviteMemberHandler $handler): JsonResponse
    {
        Gate::authorize('invite', [RoomMember::class, $room]);

        $member = $handler->handle(new InviteMemberCommand(
            roomId: $room->id,
            userId: $request->validated()['user_id'],
        ));

        return MemberResource::make($member)->response()->setStatusCode(201);
    }

    public function join(Request $request, Room $room, JoinRoomHandler $handler): JsonResponse
    {
        Gate::authorize('join', [RoomMember::class, $room]);

        $member = $handler->handle(new JoinRoomCommand(
            roomId: $room->id,
            userId: (string) $request->user()->getAuthIdentifier(),
        ));

        return MemberResource::make($member)->response()->setStatusCode(201);
    }

    public function leave(Request $request, Room $room, LeaveRoomHandler $handler): Response
    {
        Gate::authorize('leave', [RoomMember::class, $room]);

        $handler->handle(new LeaveRoomCommand(
            roomId: $room->id,
            userId: (string) $request->user()->getAuthIdentifier(),
        ));

        return response()->noContent();
    }

    public function destroy(Room $room, RoomMember $member, RemoveMemberHandler $handler): Response
    {
        Gate::authorize('remove', [RoomMember::class, $room, $member]);

        $handler->handle(new RemoveMemberCommand(
            roomId: $room->id,
            memberId: $member->id,
        ));

        return response()->noContent();
    }

    public function update(ChangeMemberRoleRequest $request, Room $room, RoomMember $member, ChangeMemberRoleHandler $handler): MemberResource
    {
        Gate::authorize('changeRole', [RoomMember::class, $room, $member]);

        return MemberResource::make($handler->handle(new ChangeMemberRoleCommand(
            roomId: $room->id,
            memberId: $member->id,
            role: $request->validated()['role'],
        )));
    }
}
