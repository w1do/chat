<?php

declare(strict_types=1);

namespace Vendor\Identity\Presentation\Http\Api\V1\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Vendor\Identity\Application\Commands\ClearWallpaperCommand;
use Vendor\Identity\Application\Commands\SetWallpaperCommand;
use Vendor\Identity\Application\Handlers\Commands\ClearWallpaperHandler;
use Vendor\Identity\Application\Handlers\Commands\SetWallpaperHandler;
use Vendor\Identity\Presentation\Http\Api\V1\Requests\UploadProfileImageRequest;
use Vendor\Identity\Presentation\Http\Api\V1\Resources\ProfileImageResource;

/** Личные обои переписки: их видит только владелец (design 5). */
final class WallpaperController
{
    public function store(UploadProfileImageRequest $request, SetWallpaperHandler $handler): ProfileImageResource
    {
        $file = $request->file('image');

        return ProfileImageResource::make($handler->handle(new SetWallpaperCommand(
            userId: (string) $request->user()->getAuthIdentifier(),
            filePath: $file->getRealPath(),
            fileName: (string) $file->getClientOriginalName(),
        )));
    }

    public function destroy(Request $request, ClearWallpaperHandler $handler): Response
    {
        $handler->handle(new ClearWallpaperCommand((string) $request->user()->getAuthIdentifier()));

        return response()->noContent();
    }
}
