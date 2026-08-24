<?php

declare(strict_types=1);

namespace Vendor\Chat\Presentation\Http\Api\V1\Controllers;

use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;
use Vendor\Chat\Application\Commands\SetTypingCommand;
use Vendor\Chat\Application\Handlers\Commands\SetTypingHandler;
use Vendor\Chat\Domain\Models\Message;
use Vendor\Chat\Domain\Models\Room;
use Vendor\Chat\Presentation\Http\Api\V1\Requests\SetTypingRequest;

final class TypingController
{
    public function store(SetTypingRequest $request, Room $room, SetTypingHandler $handler): Response
    {
        Gate::authorize('send', [Message::class, $room]);

        $handler->handle(new SetTypingCommand(
            roomId: $room->id,
            userId: (string) $request->user()->getAuthIdentifier(),
            isTyping: (bool) $request->validated()['is_typing'],
        ));

        return response()->noContent();
    }
}
