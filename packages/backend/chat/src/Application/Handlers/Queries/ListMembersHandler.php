<?php

declare(strict_types=1);

namespace Vendor\Chat\Application\Handlers\Queries;

use Vendor\Chat\Application\DTOs\MemberData;
use Vendor\Chat\Application\Queries\ListMembersQuery;
use Vendor\Chat\Application\Support\AuthorDirectory;
use Vendor\Chat\Domain\Models\RoomMember;

final readonly class ListMembersHandler
{
    /** @return list<MemberData> */
    public function handle(ListMembersQuery $query): array
    {
        $members = RoomMember::query()
            ->where('room_id', $query->roomId)
            ->orderByRaw("case role when 'owner' then 0 when 'admin' then 1 else 2 end")
            ->orderBy('joined_at')
            ->get();

        // Имя и аватарка — через настроенный auth-провайдер приложения,
        // одним запросом и без знания конкретной модели чужого пакета (§4.1).
        $authors = AuthorDirectory::forIds($members->pluck('user_id'));

        return $members->map(fn (RoomMember $member): MemberData => MemberData::fromModel(
            $member,
            name: AuthorDirectory::name($authors, $member->user_id),
            avatarUrl: AuthorDirectory::avatar($authors, $member->user_id),
        ))->all();
    }
}
