<?php

declare(strict_types=1);

namespace Vendor\Identity\Application\Handlers\Commands;

use Symfony\Component\HttpKernel\Exception\ConflictHttpException;
use Vendor\Identity\Application\Commands\UploadAvatarCommand;
use Vendor\Identity\Application\DTOs\ProfileImageData;
use Vendor\Identity\Domain\Models\User;
use Vendor\Identity\Infrastructure\Auth\UserModel;
use Vendor\Identity\Infrastructure\Images\WebpImage;

/**
 * Загруженная аватарка пополняет набор и сразу становится текущей: человек
 * загружает картинку, чтобы её показывать, а не чтобы потом ещё выбирать.
 */
final readonly class UploadAvatarHandler
{
    public function __construct(private UserModel $users) {}

    public function handle(UploadAvatarCommand $command): ProfileImageData
    {
        $user = $this->users->findOrFail($command->userId);
        $limit = (int) config('identity.images.max_avatars', 12);

        if ($user->getMedia(User::AVATARS)->count() >= $limit) {
            throw new ConflictHttpException(
                "Набор аватарок заполнен: не больше {$limit}. Удалите ненужную.",
            );
        }

        $size = (int) config('identity.images.avatar.large', 512);
        // В хранилище уезжает уже подготовленный webp: исходник не хранится.
        $prepared = WebpImage::prepare($command->filePath, $size, $size);

        $media = $user->addMedia($prepared)
            ->usingFileName(pathinfo($command->fileName, PATHINFO_FILENAME).'.webp')
            ->toMediaCollection(User::AVATARS);

        $user->avatar_media_id = $media->getKey();
        $user->save();

        // Конверсия могла успеть выполниться (синхронная очередь): перечитываем,
        // иначе мелкий размер выглядел бы неготовым, хотя он уже есть.
        return ProfileImageData::avatar($media->refresh(), current: true);
    }
}
