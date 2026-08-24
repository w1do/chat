<?php

declare(strict_types=1);

namespace Vendor\Administration\Infrastructure\Redaction;

/**
 * Журнал не должен становиться вторым хранилищем приватного текста и секретов
 * (CLAUDE.md §11): опасные ключи заменяются пометкой, длинные строки режутся.
 */
final readonly class ContextRedactor
{
    private const REDACTED = '[redacted]';

    /** Подстроки в имени ключа, после которых значение не сохраняется. */
    private const SENSITIVE = [
        'password', 'secret', 'token', 'key', 'authorization', 'cookie',
        'prompt', 'completion', 'suggestion', 'body', 'text', 'message_body', 'email',
    ];

    public function __construct(private int $maxStringLength = 200) {}

    /**
     * @param  array<string, mixed>  $context
     * @return array<string, mixed>
     */
    public function redact(array $context): array
    {
        $safe = [];

        foreach ($context as $key => $value) {
            // Проверка по имени ключа нужна только тексту: число или флаг
            // не бывают секретом, поэтому счётчики вроде `tokens` уцелеют.
            $safe[$key] = (is_string($value) || is_array($value)) && $this->isSensitive((string) $key)
                ? self::REDACTED
                : $this->clean($value);
        }

        return $safe;
    }

    private function isSensitive(string $key): bool
    {
        $needle = mb_strtolower($key);

        foreach (self::SENSITIVE as $marker) {
            if (str_contains($needle, $marker)) {
                return true;
            }
        }

        return false;
    }

    private function clean(mixed $value): mixed
    {
        if (is_array($value)) {
            /** @var array<string, mixed> $value */
            return $this->redact($value);
        }

        if (is_string($value)) {
            return mb_strlen($value) > $this->maxStringLength
                ? mb_substr($value, 0, $this->maxStringLength).'…'
                : $value;
        }

        if (is_scalar($value) || $value === null) {
            return $value;
        }

        // Объекты в журнал не попадают: их содержимое непредсказуемо.
        return self::REDACTED;
    }
}
