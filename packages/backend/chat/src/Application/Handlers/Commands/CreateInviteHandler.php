<?php

declare(strict_types=1);

namespace Vendor\Chat\Application\Handlers\Commands;

use Illuminate\Contracts\Config\Repository;
use Illuminate\Support\Carbon;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;
use Vendor\Chat\Application\Commands\CreateInviteCommand;
use Vendor\Chat\Application\DTOs\InviteData;
use Vendor\Chat\Domain\Models\Room;
use Vendor\Chat\Domain\Models\RoomInvite;

/**
 * Создание ссылки-приглашения. Токен показывается ровно один раз — в ответе
 * на этот запрос; в базе остаётся только его хэш.
 */
final readonly class CreateInviteHandler
{
    public function __construct(private Repository $config) {}

    public function handle(CreateInviteCommand $command): InviteData
    {
        /** @var Room $room */
        $room = Room::query()->findOrFail($command->roomId);

        if ($room->archived_at !== null) {
            throw new ConflictHttpException('Archived rooms cannot be joined.');
        }

        // 32 случайных байта: перебор ссылки бессмыслен.
        $token = rtrim(strtr(base64_encode(random_bytes(32)), '+/', '-_'), '=');

        $invite = RoomInvite::query()->create([
            'room_id' => $room->id,
            'created_by' => $command->userId,
            'token_hash' => RoomInvite::hashToken($token),
            'expires_at' => Carbon::now()->addDays((int) $this->config->get('chat.invites.lifetime_days', 7)),
        ]);

        return InviteData::fromModel($invite, roomName: $room->name, token: $token);
    }
}
