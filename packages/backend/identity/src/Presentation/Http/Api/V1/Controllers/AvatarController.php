<?php

declare(strict_types=1);

namespace Vendor\Identity\Presentation\Http\Api\V1\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Vendor\Identity\Application\Commands\ClearAvatarCommand;
use Vendor\Identity\Application\Commands\DeleteAvatarCommand;
use Vendor\Identity\Application\Commands\SelectAvatarCommand;
use Vendor\Identity\Application\Commands\UploadAvatarCommand;
use Vendor\Identity\Application\Handlers\Commands\ClearAvatarHandler;
use Vendor\Identity\Application\Handlers\Commands\DeleteAvatarHandler;
use Vendor\Identity\Application\Handlers\Commands\SelectAvatarHandler;
use Vendor\Identity\Application\Handlers\Commands\UploadAvatarHandler;
use Vendor\Identity\Application\Handlers\Queries\ListAvatarsHandler;
use Vendor\Identity\Application\Queries\ListAvatarsQuery;
use Vendor\Identity\Presentation\Http\Api\V1\Requests\UploadProfileImageRequest;
use Vendor\Identity\Presentation\Http\Api\V1\Resources\ProfileImageResource;

/**
 * Аватарки человека. Все действия — только над собственным профилем: чужой
 * набор не читается и не правится (spec identity/profile-images).
 */
final class AvatarController
{
    public function index(Request $request, ListAvatarsHandler $handler): AnonymousResourceCollection
    {
        return ProfileImageResource::collection($handler->handle(
            new ListAvatarsQuery((string) $request->user()->getAuthIdentifier()),
        ));
    }

    public function store(UploadProfileImageRequest $request, UploadAvatarHandler $handler): JsonResponse
    {
        $file = $request->file('image');

        return ProfileImageResource::make($handler->handle(new UploadAvatarCommand(
            userId: (string) $request->user()->getAuthIdentifier(),
            filePath: $file->getRealPath(),
            fileName: (string) $file->getClientOriginalName(),
        )))->response()->setStatusCode(201);
    }

    public function select(Request $request, string $avatar, SelectAvatarHandler $handler): ProfileImageResource
    {
        return ProfileImageResource::make($handler->handle(new SelectAvatarCommand(
            userId: (string) $request->user()->getAuthIdentifier(),
            avatarId: $avatar,
        )));
    }

    public function destroy(Request $request, string $avatar, DeleteAvatarHandler $handler): Response
    {
        $handler->handle(new DeleteAvatarCommand(
            userId: (string) $request->user()->getAuthIdentifier(),
            avatarId: $avatar,
        ));

        return response()->noContent();
    }

    /** Снять текущую, сохранив набор: человек возвращается к букве имени. */
    public function clear(Request $request, ClearAvatarHandler $handler): Response
    {
        $handler->handle(new ClearAvatarCommand((string) $request->user()->getAuthIdentifier()));

        return response()->noContent();
    }
}
