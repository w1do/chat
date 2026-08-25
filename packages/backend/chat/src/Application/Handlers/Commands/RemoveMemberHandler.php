<?php

declare(strict_types=1);

namespace Vendor\Chat\Application\Handlers\Commands;

use Illuminate\Contracts\Events\Dispatcher;
use Illuminate\Database\ConnectionResolverInterface;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;
use Vendor\Chat\Application\Commands\RemoveMemberCommand;
use Vendor\Chat\Domain\Enums\RoomRole;
use Vendor\Chat\Domain\Enums\SystemEvent;
use Vendor\Chat\Domain\Events\MessageCreated;
use Vendor\Chat\Domain\Events\RoomMemberChanged;
use Vendor\Chat\Domain\Models\RoomMember;

final readonly class RemoveMemberHandler
{
    use RecordsSystemMessage;

    public function __construct(
        private ConnectionResolverInterface $db,
        private Dispatcher $events,
    ) {}

    public function handle(RemoveMemberCommand $command): void
    {
        $systemMessageId = null;
        $removedUserId = null;

        $this->db->connection()->transaction(function () use ($command, &$systemMessageId, &$removedUserId): void {
            /** @var RoomMember $member */
            $member = RoomMember::query()
                ->where('room_id', $command->roomId)
                ->lockForUpdate()
                ->findOrFail($command->memberId);

            // Комната без владельца неуправляема: его участие снимает только
            // передача владения, а не исключение.
            if ($member->role === RoomRole::Owner) {
                throw new ConflictHttpException('The room owner cannot be removed.');
            }

            $member->delete();
            $removedUserId = $member->user_id;

            // Системная запись создаётся в той же транзакции: откат уносит и её.
            $systemMessageId = $this->recordSystemMessage(
                $command->roomId,
                $member->user_id,
                SystemEvent::MemberRemoved,
            )->id;
        });

        $this->events->dispatch(new RoomMemberChanged($command->roomId, (string) $removedUserId, 'removed', null));
        $this->events->dispatch(new MessageCreated($command->roomId, (string) $systemMessageId));
    }
}
