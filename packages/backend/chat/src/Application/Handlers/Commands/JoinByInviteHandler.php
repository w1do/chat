<?php

declare(strict_types=1);

namespace Vendor\Chat\Application\Handlers\Commands;

use Illuminate\Contracts\Events\Dispatcher;
use Illuminate\Database\ConnectionResolverInterface;
use Illuminate\Support\Carbon;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Vendor\Chat\Application\Commands\JoinByInviteCommand;
use Vendor\Chat\Application\DTOs\MemberData;
use Vendor\Chat\Domain\Enums\RoomRole;
use Vendor\Chat\Domain\Enums\SystemEvent;
use Vendor\Chat\Domain\Events\MessageCreated;
use Vendor\Chat\Domain\Events\RoomMemberChanged;
use Vendor\Chat\Domain\Models\Room;
use Vendor\Chat\Domain\Models\RoomInvite;
use Vendor\Chat\Domain\Models\RoomMember;

/**
 * Вступление по ссылке. Повторный переход безопасен: человек просто снова
 * оказывается в комнате, второй записи об участии не появляется.
 */
final readonly class JoinByInviteHandler
{
    use RecordsSystemMessage;

    public function __construct(
        private ConnectionResolverInterface $db,
        private Dispatcher $events,
    ) {}

    public function handle(JoinByInviteCommand $command): MemberData
    {
        $systemMessageId = null;
        $joined = false;

        $member = $this->db->connection()->transaction(function () use ($command, &$systemMessageId, &$joined): RoomMember {
            /** @var ?RoomInvite $invite */
            $invite = RoomInvite::query()
                ->where('token_hash', RoomInvite::hashToken($command->token))
                ->lockForUpdate()
                ->first();

            // Отозванная, просроченная и несуществующая ссылка неотличимы
            // снаружи: подсказывать перебирающему нечего.
            if ($invite === null || ! $invite->isUsable()) {
                throw new NotFoundHttpException('Invite is not available.');
            }

            /** @var Room $room */
            $room = Room::query()->findOrFail($invite->room_id);

            $existing = $room->members()->where('user_id', $command->userId)->first();

            if ($existing !== null) {
                return $existing;
            }

            $member = $room->members()->create([
                'user_id' => $command->userId,
                'role' => RoomRole::Member,
                'joined_at' => Carbon::now(),
            ]);

            $invite->forceFill([
                'uses' => $invite->uses + 1,
                'last_used_at' => Carbon::now(),
            ])->save();

            $systemMessageId = $this->recordSystemMessage(
                $invite->room_id,
                $command->userId,
                SystemEvent::MemberJoined,
            )->id;
            $joined = true;

            return $member;
        });

        // События — после commit, как и в остальных сценариях комнаты.
        if ($joined) {
            $this->events->dispatch(new RoomMemberChanged($member->room_id, $command->userId, 'joined', RoomRole::Member->value));
            $this->events->dispatch(new MessageCreated($member->room_id, (string) $systemMessageId));
        }

        return MemberData::fromModel($member);
    }
}
