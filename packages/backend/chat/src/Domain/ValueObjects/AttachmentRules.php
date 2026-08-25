<?php

declare(strict_types=1);

namespace Vendor\Chat\Domain\ValueObjects;

/**
 * Что установка принимает как вложение. Решение по файлу: расширение — из
 * белого списка, фактический тип содержимого — из допустимых для этого
 * расширения; совпасть должны оба (spec chat/attachments, design 6).
 * Исполняемое отклоняется всегда, даже если попало в белый список.
 */
final readonly class AttachmentRules
{
    /**
     * @param  array<string, list<string>>  $types  расширение → допустимые MIME
     * @param  list<string>  $forbiddenExtensions
     */
    private function __construct(
        public int $maxFiles,
        public int $maxSizeKb,
        public array $types,
        public array $forbiddenExtensions,
    ) {}

    /** @param array<string, mixed> $config секция chat.attachments */
    public static function fromConfig(array $config): self
    {
        /** @var array<string, list<string>> $types */
        $types = array_change_key_case((array) ($config['types'] ?? []));

        // Администратор может сузить список одним параметром окружения.
        $narrowed = trim((string) ($config['extensions'] ?? ''));
        if ($narrowed !== '') {
            $allowed = array_map('trim', explode(',', mb_strtolower($narrowed)));
            $types = array_intersect_key($types, array_flip($allowed));
        }

        return new self(
            maxFiles: max(1, (int) ($config['max_files'] ?? 10)),
            maxSizeKb: max(1, (int) ($config['max_size_kb'] ?? 25600)),
            types: $types,
            forbiddenExtensions: array_map(
                mb_strtolower(...),
                array_values((array) ($config['forbidden_extensions'] ?? [])),
            ),
        );
    }

    /**
     * Причина отказа для файла или null, когда файл принимается.
     * $realMime — тип, определённый по содержимому, а не заявленный клиентом.
     */
    public function rejectionReason(string $fileName, string $realMime): ?string
    {
        $extension = mb_strtolower(pathinfo($fileName, PATHINFO_EXTENSION));

        if ($extension === '') {
            return 'Файл без расширения не принимается.';
        }

        if (in_array($extension, $this->forbiddenExtensions, true)) {
            return 'Исполняемые файлы и скрипты не принимаются.';
        }

        $allowedMimes = $this->types[$extension] ?? null;

        if ($allowedMimes === null) {
            return "Файлы .{$extension} не принимаются.";
        }

        if (! in_array(mb_strtolower($realMime), array_map(mb_strtolower(...), $allowedMimes), true)) {
            return 'Содержимое файла не совпадает с его расширением.';
        }

        return null;
    }
}
