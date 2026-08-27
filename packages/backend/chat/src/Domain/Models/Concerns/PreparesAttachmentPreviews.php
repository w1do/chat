<?php

declare(strict_types=1);

namespace Vendor\Chat\Domain\Models\Concerns;

use Spatie\MediaLibrary\MediaCollections\Models\Media;
use Vendor\Chat\Domain\Models\Message;

/**
 * Миниатюра вложения-изображения. Конверсию регистрируют оба владельца
 * коллекции attachments: сообщение — для отправленных, комната — для ещё
 * не отправленных (design 3, 5). Настройка одна, чтобы не разъезжалась.
 */
trait PreparesAttachmentPreviews
{
    protected function registerAttachmentPreviewConversion(?Media $media = null): void
    {
        $conversion = $this->addMediaConversion(Message::ATTACHMENT_PREVIEW)
            ->performOnCollections(Message::ATTACHMENTS);

        // Типовой снимок готовится прямо при загрузке: ответ на неё уже несёт
        // адрес миниатюры, и в ленте не остаётся серой плитки (design 1).
        // Тяжёлый файл уходит в отдельную очередь конверсий
        // (media-library.queue_name) — пачка фотографий не задерживает
        // отправку. Не-изображения библиотека пропускает сама.
        self::previewFitsSyncBudget($media)
            ? $conversion->nonQueued()
            : $conversion->queued();

        $conversion
            ->format('webp')
            ->width((int) config('chat.attachments.thumb', 640));
    }

    /** Решение принимается по размеру файла: он известен до чтения картинки. */
    private static function previewFitsSyncBudget(?Media $media): bool
    {
        if ($media === null) {
            return false;
        }

        $maxKilobytes = (int) config('chat.attachments.preview_sync_max_kb', 4096);

        return $maxKilobytes > 0 && (int) $media->size <= $maxKilobytes * 1024;
    }
}
