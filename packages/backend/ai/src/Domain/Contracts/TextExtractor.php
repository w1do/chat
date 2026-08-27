<?php

declare(strict_types=1);

namespace Vendor\Ai\Domain\Contracts;

/** Извлечение читаемого текста из документа: PDF, DOCX или простой текст. */
interface TextExtractor
{
    /**
     * @param  string  $contents  байты файла
     *
     * @throws UnreadableDocument когда текста в файле нет или формат не поддержан
     */
    public function extract(string $contents, string $mimeType, string $extension): string;
}
