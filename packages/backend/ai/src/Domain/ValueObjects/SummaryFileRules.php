<?php

declare(strict_types=1);

namespace Vendor\Ai\Domain\ValueObjects;

/**
 * Что установка соглашается пересказывать. Уже белого списка вложений:
 * помощник читает документы, а не архивы и видео (spec: supported types).
 */
final readonly class SummaryFileRules
{
    /** @param array<string, list<string>> $types расширение → допустимые MIME */
    private function __construct(
        public int $maxSizeKb,
        public array $types,
    ) {}

    /** @param array<string, mixed> $config секция ai.file_summary */
    public static function fromConfig(array $config): self
    {
        /** @var array<string, list<string>> $types */
        $types = array_change_key_case((array) ($config['types'] ?? []));

        return new self(
            maxSizeKb: max(1, (int) ($config['max_file_size_kb'] ?? 5120)),
            types: $types,
        );
    }

    /** Причина отказа или null, когда документ принимается. */
    public function rejectionReason(SummaryTarget $target): ?string
    {
        $extension = $target->extension();

        if (! array_key_exists($extension, $this->types)) {
            $supported = implode(', ', array_map(static fn (string $type): string => ".{$type}", array_keys($this->types)));

            return "Помощник пересказывает только документы: {$supported}.";
        }

        $allowed = array_map(mb_strtolower(...), $this->types[$extension]);

        if (! in_array(mb_strtolower($target->mimeType), $allowed, true)) {
            return 'Содержимое файла не совпадает с его расширением.';
        }

        if ($target->size > $this->maxSizeKb * 1024) {
            $limit = (int) round($this->maxSizeKb / 1024);

            return "Документ больше {$limit} МБ — пересказать его нельзя.";
        }

        return null;
    }

    /** @return list<string> */
    public function supportedExtensions(): array
    {
        return array_map(strval(...), array_keys($this->types));
    }
}
