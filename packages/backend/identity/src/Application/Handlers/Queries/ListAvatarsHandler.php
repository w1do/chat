<?php

declare(strict_types=1);

namespace Vendor\Identity\Application\Handlers\Queries;

use Spatie\MediaLibrary\MediaCollections\Models\Media;
use Vendor\Identity\Application\DTOs\ProfileImageData;
use Vendor\Identity\Application\Queries\ListAvatarsQuery;
use Vendor\Identity\Domain\Models\User;
use Vendor\Identity\Infrastructure\Auth\UserModel;

/** Набор аватарок — личное дело владельца (design 3): отдаётся только ему. */
final readonly class ListAvatarsHandler
{
    public function __construct(private UserModel $users) {}

    /** @return list<ProfileImageData> */
    public function handle(ListAvatarsQuery $query): array
    {
        $user = $this->users->findOrFail($query->userId);

        return $user->getMedia(User::AVATARS)
            ->sortByDesc(fn (Media $media): string => (string) $media->created_at)
            ->map(fn (Media $media): ProfileImageData => ProfileImageData::avatar(
                $media,
                current: $user->avatar_media_id === $media->getKey(),
            ))
            ->values()
            ->all();
    }
}
