<?php

declare(strict_types=1);

namespace Vendor\Chat\Presentation\Http\Api\V1\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;
use Vendor\Chat\Application\Commands\HideDirectConversationCommand;
use Vendor\Chat\Application\Commands\StartDirectConversationCommand;
use Vendor\Chat\Application\Handlers\Commands\HideDirectConversationHandler;
use Vendor\Chat\Application\Handlers\Commands\StartDirectConversationHandler;
use Vendor\Chat\Application\Handlers\Queries\SearchMemberCandidatesHandler;
use Vendor\Chat\Application\Queries\SearchMemberCandidatesQuery;
use Vendor\Chat\Domain\Models\Room;
use Vendor\Chat\Domain\Models\RoomMember;
use Vendor\Chat\Presentation\Http\Api\V1\Requests\SearchMemberCandidatesRequest;
use Vendor\Chat\Presentation\Http\Api\V1\Requests\StartDirectConversationRequest;
use Vendor\Chat\Presentation\Http\Api\V1\Resources\MemberCandidateResource;
use Vendor\Chat\Presentation\Http\Api\V1\Resources\RoomResource;

final class DirectConversationController
{
    /** Начало диалога идемпотентно: повтор возвращает ту же переписку (200). */
    public function store(StartDirectConversationRequest $request, StartDirectConversationHandler $handler): JsonResponse
    {
        $result = $handler->handle(new StartDirectConversationCommand(
            initiatorId: (string) $request->user()->getAuthIdentifier(),
            counterpartId: $request->validated()['user_id'],
        ));

        return RoomResource::make($result['room'])
            ->response()
            ->setStatusCode($result['created'] ? 201 : 200);
    }

    /**
     * С кем можно начать переписку: тот же поиск по нику, что и приглашение,
     * только без комнаты и без самого ищущего.
     */
    public function candidates(
        SearchMemberCandidatesRequest $request,
        SearchMemberCandidatesHandler $handler,
    ): AnonymousResourceCollection {
        return MemberCandidateResource::collection($handler->handle(new SearchMemberCandidatesQuery(
            roomId: null,
            term: (string) ($request->validated()['query'] ?? ''),
            excludeUserId: (string) $request->user()->getAuthIdentifier(),
        )));
    }

    /** Скрыть диалог у себя; переписка и собеседник не затрагиваются. */
    public function hide(Request $request, Room $room, HideDirectConversationHandler $handler): Response
    {
        Gate::authorize('hide', [RoomMember::class, $room]);

        $handler->handle(new HideDirectConversationCommand(
            roomId: $room->id,
            userId: (string) $request->user()->getAuthIdentifier(),
        ));

        return response()->noContent();
    }
}
