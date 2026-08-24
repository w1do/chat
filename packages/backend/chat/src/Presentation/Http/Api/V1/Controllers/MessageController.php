<?php

declare(strict_types=1);

namespace Vendor\Chat\Presentation\Http\Api\V1\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;
use Vendor\Chat\Application\Commands\DeleteMessageCommand;
use Vendor\Chat\Application\Commands\EditMessageCommand;
use Vendor\Chat\Application\Commands\SendMessageCommand;
use Vendor\Chat\Application\Handlers\Commands\DeleteMessageHandler;
use Vendor\Chat\Application\Handlers\Commands\EditMessageHandler;
use Vendor\Chat\Application\Handlers\Commands\SendMessageHandler;
use Vendor\Chat\Application\Handlers\Queries\GetMessageHandler;
use Vendor\Chat\Application\Handlers\Queries\ListMessagesHandler;
use Vendor\Chat\Application\Queries\GetMessageQuery;
use Vendor\Chat\Application\Queries\ListMessagesQuery;
use Vendor\Chat\Domain\Models\Message;
use Vendor\Chat\Domain\Models\Room;
use Vendor\Chat\Presentation\Http\Api\V1\Requests\EditMessageRequest;
use Vendor\Chat\Presentation\Http\Api\V1\Requests\SendMessageRequest;
use Vendor\Chat\Presentation\Http\Api\V1\Resources\MessageResource;

final class MessageController
{
    public function index(Request $request, Room $room, ListMessagesHandler $handler): JsonResponse
    {
        Gate::authorize('viewAny', [Message::class, $room]);

        $page = $handler->handle(new ListMessagesQuery(
            roomId: $room->id,
            cursor: $request->query('cursor'),
            limit: (int) $request->query('limit', (string) config('chat.message.page_size', 50)),
        ), (string) $request->user()->getAuthIdentifier());

        return new JsonResponse([
            'data' => MessageResource::collection($page->items)->resolve($request),
            'meta' => ['next_cursor' => $page->nextCursor],
        ]);
    }

    public function store(SendMessageRequest $request, Room $room, SendMessageHandler $handler): JsonResponse
    {
        Gate::authorize('send', [Message::class, $room]);

        $validated = $request->validated();

        $result = $handler->handle(new SendMessageCommand(
            roomId: $room->id,
            authorId: (string) $request->user()->getAuthIdentifier(),
            body: $validated['body'],
            replyToId: $validated['reply_to_id'] ?? null,
            mentions: $validated['mentions'] ?? [],
            idempotencyKey: $request->header('Idempotency-Key'),
        ));

        return MessageResource::make($result['message'])
            ->response()
            ->setStatusCode($result['replayed'] ? 200 : 201);
    }

    public function show(Message $message, GetMessageHandler $handler): MessageResource
    {
        Gate::authorize('view', $message);

        return MessageResource::make($handler->handle(new GetMessageQuery($message->id)));
    }

    public function update(EditMessageRequest $request, Message $message, EditMessageHandler $handler): MessageResource
    {
        Gate::authorize('update', $message);

        return MessageResource::make($handler->handle(new EditMessageCommand(
            messageId: $message->id,
            body: $request->validated()['body'],
        )));
    }

    public function destroy(Message $message, DeleteMessageHandler $handler): Response
    {
        Gate::authorize('delete', $message);

        $handler->handle(new DeleteMessageCommand($message->id));

        return response()->noContent();
    }
}
