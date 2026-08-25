<?php

declare(strict_types=1);

namespace Vendor\Identity\Presentation\Http\Api\V1\Controllers;

use Illuminate\Http\Request;
use Spatie\MediaLibrary\MediaCollections\Models\Media;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Vendor\Identity\Domain\Models\User;

/**
 * Выдача изображений профиля. Файлы лежат в закрытом бакете и наружу не
 * смотрят (ADR-011): их отдаёт приложение, проверив право.
 *
 * Аватарку видит любой вошедший: она и так показана в списках участников и в
 * переписке. Обои — только их владелец: это личная настройка.
 */
final class ProfileImageFileController
{
    public function avatar(Request $request, string $image): StreamedResponse
    {
        return $this->stream($this->media($image, User::AVATARS));
    }

    public function avatarThumb(Request $request, string $image): StreamedResponse
    {
        $media = $this->media($image, User::AVATARS);

        // Конверсия может быть ещё не готова: тогда мелкого размера нет, и
        // отдаётся подготовленный оригинал — он всё равно webp.
        return $this->stream($media, $media->hasGeneratedConversion('thumb') ? 'thumb' : '');
    }

    public function wallpaper(Request $request, string $image): StreamedResponse
    {
        $media = $this->media($image, User::WALLPAPER);

        if ((string) $media->model_id !== (string) $request->user()->getAuthIdentifier()) {
            throw new NotFoundHttpException;
        }

        return $this->stream($media);
    }

    private function media(string $uuid, string $collection): Media
    {
        $media = Media::query()
            ->where('uuid', $uuid)
            ->where('collection_name', $collection)
            ->where('model_type', (new (config('auth.providers.users.model')))->getMorphClass())
            ->first();

        if ($media === null) {
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
            // Тип наш собственный: подготовленный webp, а не то, что прислали.
            'Content-Type' => 'image/webp',
            'Content-Disposition' => 'inline',
            // Адрес меняется вместе с картинкой, поэтому кэш безопасно долгий.
            'Cache-Control' => 'private, max-age=31536000, immutable',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }
}
