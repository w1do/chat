<?php

declare(strict_types=1);

namespace Vendor\Chat\Application\Handlers\Commands;

use Illuminate\Contracts\Events\Dispatcher;
use Illuminate\Database\ConnectionResolverInterface;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;
use Vendor\Chat\Application\Commands\JoinRoomCommand;
use Vendor\Chat\Application\DTOs\MemberData;
use Vendor\Chat\Domain\Enums\RoomRole;
use Vendor\Chat\Domain\Events\RoomMemberChanged;
use Vendor\Chat\Domain\Models\Room;
use Vendor\Chat\Domain\Models\RoomMember;

final readonly class JoinRoomHandler
{
    public function __construct(
        private ConnectionResolverInterface $db,
        private Dispatcher $events,
    ) {}

    public function handle(JoinRoomCommand $command): MemberData
    {
        $member = $this->db->connection()->transaction(function () use ($command): RoomMember {
            /** @var Room $room */
            $room = Room::query()->lockForUpdate()->findOrFail($command->roomId);

            if ($room->members()->where('user_id', $command->userId)->exists()) {
                throw new ConflictHttpException('Already a member of this room.');
            }

            return $room->members()->create([
                'user_id' => $command->userId,
                'role' => RoomRole::Member,
                'joined_at' => now(),
            ]);
        });

        $this->events->dispatch(new RoomMemberChanged($command->roomId, $command->userId, 'joined', RoomRole::Member->value));

        return MemberData::fromModel($member);
    }
}
