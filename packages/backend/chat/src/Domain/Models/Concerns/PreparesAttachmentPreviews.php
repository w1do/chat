<?php

declare(strict_types=1);

namespace Vendor\Chat\Domain\Models\Concerns;

use Vendor\Chat\Domain\Models\Message;

/**
 * Миниатюра вложения-изображения. Конверсию регистрируют оба владельца
 * коллекции attachments: сообщение — для отправленных, комната — для ещё
 * не отправленных (design 3, 5). Настройка одна, чтобы не разъезжалась.
 */
trait PreparesAttachmentPreviews
{
    protected function registerAttachmentPreviewConversion(): void
    {
        // Очередь конверсий отдельная (media-library.queue_name): пачка
        // фотографий не задерживает живую переписку. Не-изображения
        // библиотека пропускает сама.
        $this->addMediaConversion(Message::ATTACHMENT_PREVIEW)
            ->performOnCollections(Message::ATTACHMENTS)
            ->queued()
            ->format('webp')
            ->width((int) config('chat.attachments.thumb', 640));
    }
}
