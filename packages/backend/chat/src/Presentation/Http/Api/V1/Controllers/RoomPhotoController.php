<?php

declare(strict_types=1);

namespace Vendor\Chat\Presentation\Http\Api\V1\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;
use Spatie\MediaLibrary\MediaCollections\Models\Media;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Vendor\Chat\Application\Commands\ClearRoomPhotoCommand;
use Vendor\Chat\Application\Commands\SetRoomPhotoCommand;
use Vendor\Chat\Application\Handlers\Commands\ClearRoomPhotoHandler;
use Vendor\Chat\Application\Handlers\Commands\SetRoomPhotoHandler;
use Vendor\Chat\Domain\Models\Room;
use Vendor\Chat\Presentation\Http\Api\V1\Requests\UploadRoomPhotoRequest;
use Vendor\Chat\Presentation\Http\Api\V1\Resources\RoomImageResource;

/**
 * Фотография комнаты: ставят владелец и админ, видят те, кому видна сама
 * комната (spec chat/room-image).
 */
final class RoomPhotoController
{
    public function store(UploadRoomPhotoRequest $request, Room $room, SetRoomPhotoHandler $handler): RoomImageResource
    {
        Gate::authorize('changePhoto', $room);

        $file = $request->file('image');

        return RoomImageResource::make($handler->handle(new SetRoomPhotoCommand(
            roomId: $room->id,
            filePath: $file->getRealPath(),
            fileName: (string) $file->getClientOriginalName(),
        )));
    }

    public function destroy(Room $room, ClearRoomPhotoHandler $handler): Response
    {
        Gate::authorize('changePhoto', $room);

        $handler->handle(new ClearRoomPhotoCommand($room->id));

        return response()->noContent();
    }

    public function show(Request $request, string $image): StreamedResponse
    {
        return $this->stream($this->visibleMedia($request, $image));
    }

    public function thumb(Request $request, string $image): StreamedResponse
    {
        $media = $this->visibleMedia($request, $image);

        return $this->stream($media, $media->hasGeneratedConversion('thumb') ? 'thumb' : '');
    }

    /** Фотография доступна тем же, кому доступна сама комната. */
    private function visibleMedia(Request $request, string $uuid): Media
    {
        $media = Media::query()
            ->where('uuid', $uuid)
            ->where('collection_name', Room::PHOTO)
            ->where('model_type', (new Room)->getMorphClass())
            ->first();

        $room = $media === null ? null : Room::query()->find($media->model_id);

        if ($room === null || ! ($room->isPublic() || $room->hasMember($request->user()))) {
            throw new NotFoundHttpException;
        }

        return $media;
    }

    private function stream(Media $media, string $conversion = ''): StreamedResponse
    {
        $stream = $media->stream($conversion);

        return response()->stream(function () use ($stream): void {
            fpassthru($stream);
        }, 200, [
            // Тип наш собственный: подготовленный webp, а не присланный файл.
            'Content-Type' => 'image/webp',
            'Content-Disposition' => 'inline',
            'Cache-Control' => 'private, max-age=31536000, immutable',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }
}
