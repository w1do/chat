<?php

declare(strict_types=1);

namespace Vendor\Ai\Infrastructure\Prompts;

use RuntimeException;
use Vendor\Ai\Domain\Enums\RevisionOperation;

/** Системные промпты лежат текстовыми файлами: их правят без пересборки кода. */
final class PromptLibrary
{
    /** Человекочитаемое имя языка: код в промпте понимают не все модели. */
    private const LANGUAGES = ['ru' => 'русском', 'en' => 'английском'];

    public function systemPrompt(RevisionOperation $operation, ?string $tone = null, ?string $instruction = null): string
    {
        $path = __DIR__.'/'.$operation->promptFile();

        if (! is_file($path)) {
            throw new RuntimeException("Missing prompt for operation {$operation->value}.");
        }

        return str_replace(
            ['{tone}', '{instruction}'],
            [$tone ?? 'нейтральный', $instruction ?? ''],
            trim((string) file_get_contents($path)),
        );
    }

    /** Промпт пересказа документа: язык и окно длины задаёт вызывающий. */
    public function summaryPrompt(string $locale, int $minLength, int $maxLength): string
    {
        $path = __DIR__.'/summarize.system.txt';

        if (! is_file($path)) {
            throw new RuntimeException('Missing prompt for the file summary operation.');
        }

        return str_replace(
            ['{language}', '{locale}', '{min}', '{max}'],
            [self::LANGUAGES[$locale] ?? self::LANGUAGES['en'], $locale, (string) $minLength, (string) $maxLength],
            trim((string) file_get_contents($path)),
        );
    }
}
