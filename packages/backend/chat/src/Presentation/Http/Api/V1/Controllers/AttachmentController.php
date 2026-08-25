<?php

declare(strict_types=1);

namespace Vendor\Chat\Presentation\Http\Api\V1\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;
use Vendor\Chat\Application\Commands\UploadAttachmentCommand;
use Vendor\Chat\Application\Handlers\Commands\UploadAttachmentHandler;
use Vendor\Chat\Domain\Models\Message;
use Vendor\Chat\Domain\Models\Room;
use Vendor\Chat\Presentation\Http\Api\V1\Requests\UploadAttachmentRequest;
use Vendor\Chat\Presentation\Http\Api\V1\Resources\AttachmentResource;

/**
 * Загрузка вложения отдельным запросом до отправки сообщения (design 3):
 * так у каждого файла свой ход загрузки и своя ошибка. Право — то же, что
 * на отправку сообщения в комнату.
 */
final class AttachmentController
{
    public function store(UploadAttachmentRequest $request, Room $room, UploadAttachmentHandler $handler): JsonResponse
    {
        Gate::authorize('send', [Message::class, $room]);

        $file = $request->file('file');

        return AttachmentResource::make($handler->handle(new UploadAttachmentCommand(
            roomId: $room->id,
            uploaderId: (string) $request->user()->getAuthIdentifier(),
            filePath: (string) $file->getRealPath(),
            fileName: (string) $file->getClientOriginalName(),
        )))->response()->setStatusCode(201);
    }
}
