<?php

declare(strict_types=1);

namespace Vendor\Chat\Application\Handlers\Commands;

use Illuminate\Contracts\Bus\Dispatcher as BusDispatcher;
use Illuminate\Contracts\Events\Dispatcher;
use Illuminate\Database\ConnectionResolverInterface;
use Illuminate\Database\Eloquent\Collection;
use Spatie\MediaLibrary\MediaCollections\Models\Media;
use Vendor\Chat\Application\Commands\DeleteRoomCommand;
use Vendor\Chat\Domain\Events\RoomDeleted;
use Vendor\Chat\Domain\Models\Message;
use Vendor\Chat\Domain\Models\MessageReaction;
use Vendor\Chat\Domain\Models\Room;
use Vendor\Chat\Domain\Models\RoomInvite;
use Vendor\Chat\Domain\Models\RoomMember;
use Vendor\Chat\Infrastructure\Media\CleanupStoredFilesJob;

/**
 * Удаление комнаты навсегда. Что именно исчезает — видно здесь, а не только в
 * каскадах базы: реакции, сообщения, приглашения, участие, файлы вложений и
 * фотографии вместе с миниатюрами и сама комната.
 * Повторный вызов безвреден: удалять уже нечего.
 *
 * Файлы убираются отдельным заданием после commit: недоступное хранилище не
 * мешает удалению комнаты, а уборка повторяется и не теряется молча (spec
 * chat/rooms-and-messages).
 */
final readonly class DeleteRoomHandler
{
    /** Реакции удаляются пакетами: у большой комнаты идентификаторов много. */
    private const CHUNK = 500;

    public function __construct(
        private ConnectionResolverInterface $db,
        private Dispatcher $events,
        private BusDispatcher $bus,
    ) {}

    public function handle(DeleteRoomCommand $command): void
    {
        /** @var ?Room $room */
        $room = Room::query()->find($command->roomId);

        if ($room === null) {
            return;
        }

        /** @var list<string> $messageIds */
        $messageIds = Message::query()
            ->withTrashed()
            ->where('room_id', $room->id)
            ->pluck('id')
            ->all();

        // Медиа комнаты: вложения её сообщений, ещё не отправленные вложения
        // и фотография. Каталоги файлов запоминаются до удаления строк.
        $media = $this->roomMedia($room, $messageIds);
        $directoriesByDisk = $this->directoriesByDisk($media);

        $this->db->connection()->transaction(function () use ($room, $messageIds, $media): void {
            foreach (array_chunk($messageIds, self::CHUNK) as $chunk) {
                MessageReaction::query()->whereIn('message_id', $chunk)->delete();
            }

            // Строки медиа удаляются без модельных событий: файлы в хранилище
            // трогает только задание после commit, а не транзакция.
            foreach (array_chunk($media->modelKeys(), self::CHUNK) as $chunk) {
                Media::query()->whereIn('id', $chunk)->delete();
            }

            Message::query()->withTrashed()->where('room_id', $room->id)->forceDelete();
            RoomInvite::query()->where('room_id', $room->id)->delete();
            RoomMember::query()->where('room_id', $room->id)->delete();

            $room->delete();
        });

        foreach ($directoriesByDisk as $disk => $directories) {
            $this->bus->dispatch(new CleanupStoredFilesJob($disk, $directories));
        }

        $this->events->dispatch(new RoomDeleted($room->id, $room->name, $command->actorId, $messageIds));
    }

    /**
     * @param  list<string>  $messageIds
     * @return Collection<int, Media>
     */
    private function roomMedia(Room $room, array $messageIds): Collection
    {
        return Media::query()
            ->where(function ($query) use ($room, $messageIds): void {
                $query->where(function ($own) use ($room): void {
                    $own->where('model_type', $room->getMorphClass())
                        ->where('model_id', $room->id);
                });

                if ($messageIds !== []) {
                    $query->orWhere(function ($messages) use ($messageIds): void {
                        $messages->where('model_type', (new Message)->getMorphClass())
                            ->whereIn('model_id', $messageIds);
                    });
                }
            })
            ->get();
    }

    /**
     * Каталог медиа хранит оригинал и его конверсии: одного удаления каталога
     * достаточно и для файла, и для миниатюр.
     *
     * @param  Collection<int, Media>  $media
     * @return array<string, list<string>>
     */
    private function directoriesByDisk(Collection $media): array
    {
        $result = [];

        foreach ($media as $item) {
            $directory = dirname($item->getPathRelativeToRoot());

            foreach (array_unique([(string) $item->disk, (string) ($item->conversions_disk ?? $item->disk)]) as $disk) {
                $result[$disk][] = $directory;
            }
        }

        return array_map(fn (array $directories): array => array_values(array_unique($directories)), $result);
    }
}
