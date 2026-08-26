<?php

declare(strict_types=1);

namespace Vendor\Chat\Application\Handlers\Commands;

use Illuminate\Database\ConnectionResolverInterface;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Validation\ValidationException;
use InvalidArgumentException;
use RuntimeException;
use Vendor\Chat\Application\Commands\StartDirectConversationCommand;
use Vendor\Chat\Application\DTOs\RoomData;
use Vendor\Chat\Application\Support\Counterparts;
use Vendor\Chat\Domain\Enums\RoomKind;
use Vendor\Chat\Domain\Enums\RoomRole;
use Vendor\Chat\Domain\Enums\RoomVisibility;
use Vendor\Chat\Domain\Models\Room;
use Vendor\Chat\Domain\ValueObjects\DirectPair;

/**
 * Начало личной переписки. Операция идемпотентна по смыслу: повтор возвращает
 * ту же переписку. Единственность пары гарантирует уникальный индекс, а не
 * проверка перед вставкой — встречное одновременное начало упирается в него,
 * и обработчик возвращает уже созданный диалог (design 3, 6).
 */
final readonly class StartDirectConversationHandler
{
    public function __construct(private ConnectionResolverInterface $db) {}

    /** @return array{room: RoomData, created: bool} */
    public function handle(StartDirectConversationCommand $command): array
    {
        try {
            $pair = DirectPair::of($command->initiatorId, $command->counterpartId);
        } catch (InvalidArgumentException) {
            throw ValidationException::withMessages([
                'user_id' => ['You cannot start a conversation with yourself.'],
            ]);
        }

        $userModel = config('auth.providers.users.model');

        if (! $userModel::query()->whereKey($command->counterpartId)->exists()) {
            // Не больше того, что уже показывает поиск по нику: ник либо
            // находится там, либо человека нет.
            throw ValidationException::withMessages([
                'user_id' => ['User not found.'],
            ]);
        }

        $existing = $this->existingFor($pair);

        if ($existing === null) {
            try {
                return ['room' => $this->assemble($this->create($command, $pair), $command->initiatorId), 'created' => true];
            } catch (UniqueConstraintViolationException) {
                // Собеседник начал этот же диалог одновременно: гонку поймал
                // индекс rooms_direct_pair, открываем созданную им переписку.
                $existing = $this->existingFor($pair);
            }
        }

        if ($existing === null) {
            throw new RuntimeException('Direct conversation vanished after unique conflict.');
        }

        // Повторное начало возвращает переписку в список инициатора, даже
        // если он её скрывал: человек сам к ней вернулся (spec).
        $existing->members()
            ->where('user_id', $command->initiatorId)
            ->whereNotNull('hidden_at')
            ->update(['hidden_at' => null]);

        return ['room' => $this->assemble($existing, $command->initiatorId), 'created' => false];
    }

    private function existingFor(DirectPair $pair): ?Room
    {
        return Room::query()
            ->where('kind', RoomKind::Direct->value)
            ->where('direct_key', $pair->key())
            ->first();
    }

    private function create(StartDirectConversationCommand $command, DirectPair $pair): Room
    {
        return $this->db->connection()->transaction(function () use ($command, $pair): Room {
            $room = Room::query()->create([
                // У диалога нет названия — подпись вычисляется из собеседника.
                'name' => '',
                'topic' => null,
                'visibility' => RoomVisibility::PrivateRoom,
                'kind' => RoomKind::Direct,
                'direct_key' => $pair->key(),
                'created_by' => $command->initiatorId,
            ]);

            // Оба — member: владельца нет, и комнатные действия закрываются
            // существующими политиками (design 2).
            $room->members()->create([
                'user_id' => $command->initiatorId,
                'role' => RoomRole::Member,
                'joined_at' => now(),
            ]);

            // Пустой диалог не показывается собеседнику: его запись участия
            // скрыта до первого сообщения (spec: «появляется, когда придёт
            // первое сообщение»).
            $room->members()->create([
                'user_id' => $command->counterpartId,
                'role' => RoomRole::Member,
                'joined_at' => now(),
                'hidden_at' => now(),
            ]);

            return $room;
        });
    }

    private function assemble(Room $room, string $viewerId): RoomData
    {
        return RoomData::fromModel(
            $room,
            myRole: RoomRole::Member->value,
            memberCount: 2,
            counterpart: Counterparts::forRooms([$room], $viewerId)[$room->id] ?? null,
        );
    }
}
