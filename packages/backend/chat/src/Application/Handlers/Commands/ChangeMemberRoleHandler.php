<?php

declare(strict_types=1);

namespace Vendor\Chat\Application\Handlers\Commands;

use Illuminate\Contracts\Events\Dispatcher;
use Vendor\Chat\Application\Commands\ChangeMemberRoleCommand;
use Vendor\Chat\Application\DTOs\MemberData;
use Vendor\Chat\Domain\Enums\RoomRole;
use Vendor\Chat\Domain\Events\RoomMemberChanged;
use Vendor\Chat\Domain\Models\RoomMember;

final readonly class ChangeMemberRoleHandler
{
    public function __construct(private Dispatcher $events) {}

    public function handle(ChangeMemberRoleCommand $command): MemberData
    {
        /** @var RoomMember $member */
        $member = RoomMember::query()
            ->where('room_id', $command->roomId)
            ->findOrFail($command->memberId);

        $member->role = RoomRole::from($command->role);
        $member->save();

        $this->events->dispatch(new RoomMemberChanged($command->roomId, $member->user_id, 'role_changed', $member->role->value));

        return MemberData::fromModel($member);
    }
}
