<?php

declare(strict_types=1);

namespace Vendor\Ai\Infrastructure\Prompts;

use RuntimeException;
use Vendor\Ai\Domain\Enums\RevisionOperation;

/** Системные промпты лежат текстовыми файлами: их правят без пересборки кода. */
final class PromptLibrary
{
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
}
