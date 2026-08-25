<?php

declare(strict_types=1);

namespace Vendor\Identity\Application\Handlers\Commands;

use Vendor\Identity\Application\Commands\SetWallpaperCommand;
use Vendor\Identity\Application\DTOs\ProfileImageData;
use Vendor\Identity\Domain\Models\User;
use Vendor\Identity\Infrastructure\Auth\UserModel;
use Vendor\Identity\Infrastructure\Images\WebpImage;

/** Обои личные: коллекция из одной картинки, новая вытесняет прежнюю. */
final readonly class SetWallpaperHandler
{
    public function __construct(private UserModel $users) {}

    public function handle(SetWallpaperCommand $command): ProfileImageData
    {
        $user = $this->users->findOrFail($command->userId);

        $prepared = WebpImage::prepare(
            $command->filePath,
            (int) config('identity.images.wallpaper.width', 1440),
            (int) config('identity.images.wallpaper.height', 2560),
        );

        $media = $user->addMedia($prepared)
            ->usingFileName(pathinfo($command->fileName, PATHINFO_FILENAME).'.webp')
            ->toMediaCollection(User::WALLPAPER);

        return ProfileImageData::wallpaper($media);
    }
}
