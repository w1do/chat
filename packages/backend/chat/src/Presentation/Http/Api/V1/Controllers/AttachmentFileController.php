<?php

declare(strict_types=1);

namespace Vendor\Chat\Presentation\Http\Api\V1\Controllers;

use Illuminate\Http\Request;
use Spatie\MediaLibrary\MediaCollections\Models\Media;
use Symfony\Component\HttpFoundation\HeaderUtils;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Vendor\Chat\Domain\Models\Message;
use Vendor\Chat\Domain\Models\Room;

/**
 * Выдача файлов вложений через приложение (design 4): право считается по
 * сообщению, как у чтения переписки. Хранилище закрыто, прямых ссылок нет.
 * Посторонний, исключённый и читатель удалённого сообщения получают 404 —
 * ни файла, ни имени, ни факта существования.
 */
final class AttachmentFileController
{
    public function show(Request $request, string $attachment): StreamedResponse
    {
        $media = $this->visibleMedia($request, $attachment);

        // Оригинал отдаётся только на скачивание: браузер не должен исполнять
        // или отрисовывать присланное как страницу (§11, design 4).
        return $this->stream($media, '', [
            'Content-Type' => (string) $media->mime_type,
            'Content-Length' => (string) $media->size,
            'Content-Disposition' => HeaderUtils::makeDisposition(
                HeaderUtils::DISPOSITION_ATTACHMENT,
                $media->file_name,
                self::asciiFallback($media->file_name),
            ),
        ]);
    }

    public function thumb(Request $request, string $attachment): StreamedResponse
    {
        $media = $this->visibleMedia($request, $attachment);

        if (! $media->hasGeneratedConversion(Message::ATTACHMENT_PREVIEW)) {
            throw new NotFoundHttpException;
        }

        // Миниатюра — наш собственный webp, её можно показывать в ленте.
        return $this->stream($media, Message::ATTACHMENT_PREVIEW, [
            'Content-Type' => 'image/webp',
            'Content-Disposition' => 'inline',
        ]);
    }

    private function visibleMedia(Request $request, string $uuid): Media
    {
        $media = Media::query()
            ->where('uuid', $uuid)
            ->where('collection_name', Message::ATTACHMENTS)
            ->first();

        $user = $request->user();

        if ($media !== null && $media->model_type === (new Message)->getMorphClass()) {
            // Мягко удалённое сообщение find() не вернёт: его файлы закрыты.
            $message = Message::query()->find($media->model_id);
            $room = $message?->room;

            if ($room !== null && ($room->isPublic() || $room->hasMember($user))) {
                return $media;
            }
        }

        if ($media !== null && $media->model_type === (new Room)->getMorphClass()) {
            // Ещё не отправленное вложение видит только его автор (design 3).
            if ((string) $media->getCustomProperty('uploader_id') === (string) $user->getAuthIdentifier()) {
                return $media;
            }
        }

        throw new NotFoundHttpException;
    }

    /** @param array<string, string> $headers */
    private function stream(Media $media, string $conversion, array $headers): StreamedResponse
    {
        $stream = $media->stream($conversion);

        return response()->stream(function () use ($stream): void {
            fpassthru($stream);
        }, 200, $headers + [
            // Файл неизменяем: состав вложений после отправки не редактируется.
            'Cache-Control' => 'private, max-age=31536000, immutable',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }

    private static function asciiFallback(string $fileName): string
    {
        $fallback = (string) preg_replace('/[^A-Za-z0-9._-]+/', '_', $fileName);

        return trim($fallback, '_') === '' ? 'file' : $fallback;
    }
}
