<?php

declare(strict_types=1);

namespace Vendor\Chat\Application\DTOs;

use Spatie\MediaLibrary\MediaCollections\Models\Media;
use Vendor\Chat\Domain\Models\Message;

/**
 * Вложение сообщения для представлений. Одна и та же форма уходит и в HTTP
 * API, и в событие message.created.v1 (spec contracts/api-and-realtime).
 */
final readonly class AttachmentData
{
    public function __construct(
        public string $id,
        public string $name,
        public string $mimeType,
        public int $size,
        public string $url,
        /** null — миниатюра не предусмотрена или ещё готовится (design 5). */
        public ?string $thumbUrl,
        public ?int $width,
        public ?int $height,
    ) {}

    public static function fromMedia(Media $media): self
    {
        $uuid = (string) $media->uuid;
        $isImage = str_starts_with((string) $media->mime_type, 'image/');

        return new self(
            id: $uuid,
            name: $media->name,
            mimeType: (string) $media->mime_type,
            size: (int) $media->size,
            url: route('chat.attachments.show', ['attachment' => $uuid], absolute: false),
            thumbUrl: $isImage && $media->hasGeneratedConversion(Message::ATTACHMENT_PREVIEW)
                ? route('chat.attachments.thumb', ['attachment' => $uuid], absolute: false)
                : null,
            width: self::intOrNull($media->getCustomProperty('width')),
            height: self::intOrNull($media->getCustomProperty('height')),
        );
    }

    /** @return list<self> */
    public static function forMessage(Message $message): array
    {
        return $message->attachments()
            ->map(fn (Media $media): self => self::fromMedia($media))
            ->values()
            ->all();
    }

    /** @return array<string, mixed> */
    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'mime_type' => $this->mimeType,
            'size' => $this->size,
            'url' => $this->url,
            'thumb_url' => $this->thumbUrl,
            'width' => $this->width,
            'height' => $this->height,
        ];
    }

    private static function intOrNull(mixed $value): ?int
    {
        return is_numeric($value) ? (int) $value : null;
    }
}
