<?php

declare(strict_types=1);

namespace Vendor\Ai\Domain\ValueObjects;

/**
 * Что именно пересказываем: комната, сообщение и безопасные метаданные
 * приложенного документа. Содержимое файла сюда не попадает — его читает
 * задание в момент обращения к поставщику (design 6).
 */
final readonly class SummaryTarget
{
    public function __construct(
        public string $roomId,
        public string $messageId,
        public string $attachmentId,
        public string $fileName,
        public string $mimeType,
        public int $size,
    ) {}

    public function extension(): string
    {
        return mb_strtolower(pathinfo($this->fileName, PATHINFO_EXTENSION));
    }

    /** @return array<string, mixed> */
    public function toArray(): array
    {
        return [
            'id' => $this->attachmentId,
            'name' => $this->fileName,
            'mime_type' => $this->mimeType,
            'size' => $this->size,
        ];
    }
}
