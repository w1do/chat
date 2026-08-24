<?php

declare(strict_types=1);

namespace Vendor\Chat\Presentation\Http\Api\V1\Controllers;

use Illuminate\Support\Facades\Gate;
use Vendor\Chat\Application\Commands\ToggleReactionCommand;
use Vendor\Chat\Application\Handlers\Commands\ToggleReactionHandler;
use Vendor\Chat\Domain\Models\Message;
use Vendor\Chat\Presentation\Http\Api\V1\Requests\ToggleReactionRequest;
use Vendor\Chat\Presentation\Http\Api\V1\Resources\ReactionResource;

final class ReactionController
{
    public function toggle(ToggleReactionRequest $request, Message $message, ToggleReactionHandler $handler): ReactionResource
    {
        Gate::authorize('react', $message);

        return ReactionResource::make($handler->handle(new ToggleReactionCommand(
            messageId: $message->id,
            userId: (string) $request->user()->getAuthIdentifier(),
            emoji: $request->validated()['emoji'],
        )));
    }
}
