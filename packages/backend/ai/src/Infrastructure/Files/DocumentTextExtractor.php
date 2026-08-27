<?php

declare(strict_types=1);

namespace Vendor\Ai\Infrastructure\Files;

use Vendor\Ai\Domain\Contracts\TextExtractor;
use Vendor\Ai\Domain\Contracts\UnreadableDocument;
use ZipArchive;

/**
 * Текст документа без внешних зависимостей: PDF, DOCX и простой текст.
 * Наружу уходит только извлечённый текст, поэтому разбор — здесь, а не у
 * поставщика: сканы и защищённые файлы отклоняются понятной ошибкой.
 */
final class DocumentTextExtractor implements TextExtractor
{
    public function extract(string $contents, string $mimeType, string $extension): string
    {
        $text = match (true) {
            $extension === 'pdf' || $mimeType === 'application/pdf' => self::fromPdf($contents),
            $extension === 'docx' => self::fromDocx($contents),
            default => self::fromPlainText($contents),
        };

        $text = trim((string) preg_replace('/[ \t]+/u', ' ', $text));

        if ($text === '') {
            throw new UnreadableDocument;
        }

        return $text;
    }

    /** Простой текст: приводим к UTF-8, чтобы не отправить поставщику мусор. */
    private static function fromPlainText(string $contents): string
    {
        if (mb_check_encoding($contents, 'UTF-8')) {
            return $contents;
        }

        $converted = @mb_convert_encoding($contents, 'UTF-8', 'Windows-1251, ISO-8859-1');

        return is_string($converted) ? $converted : '';
    }

    /** DOCX — zip-контейнер; текст лежит в word/document.xml. */
    private static function fromDocx(string $contents): string
    {
        $file = tempnam(sys_get_temp_dir(), 'ai-docx-');

        if ($file === false) {
            throw new UnreadableDocument('Cannot open the document.');
        }

        try {
            file_put_contents($file, $contents);

            $zip = new ZipArchive;

            if ($zip->open($file) !== true) {
                throw new UnreadableDocument('Document is not a readable DOCX file.');
            }

            $xml = $zip->getFromName('word/document.xml');
            $zip->close();

            if (! is_string($xml) || $xml === '') {
                throw new UnreadableDocument('Document has no readable text.');
            }

            // Абзацы и переносы строк — разделители: без них текст слипается.
            $xml = (string) preg_replace('#</w:p>|<w:br\s*/?>#', "\n", $xml);

            return html_entity_decode(strip_tags($xml), ENT_QUOTES | ENT_XML1, 'UTF-8');
        } finally {
            @unlink($file);
        }
    }

    /**
     * PDF: текстовые операторы из потоков содержимого. Сканы и документы с
     * нестандартной кодировкой шрифта текста не дадут — их и отклоняем.
     */
    private static function fromPdf(string $contents): string
    {
        if (! str_starts_with($contents, '%PDF')) {
            throw new UnreadableDocument('File is not a PDF document.');
        }

        $streams = [];
        if (preg_match_all('/stream\r?\n(.*?)endstream/s', $contents, $matches) > 0) {
            $streams = $matches[1];
        }

        $text = '';

        foreach ($streams as $stream) {
            $decoded = @gzuncompress($stream);

            if ($decoded === false) {
                $decoded = @gzinflate($stream);
            }

            $text .= self::pdfOperators(is_string($decoded) ? $decoded : $stream);
        }

        if (trim($text) === '') {
            throw new UnreadableDocument('PDF has no extractable text layer.');
        }

        return $text;
    }

    /** Операторы Tj/TJ несут видимый текст; остальное — разметка страницы. */
    private static function pdfOperators(string $stream): string
    {
        $text = '';

        // (строка) Tj и [(часть) сдвиг (часть)] TJ — оба кладут текст на страницу.
        if (preg_match_all('/\((?:\\\\.|[^\\\\()])*\)\s*Tj|\[(?:[^\[\]]|\\\\.)*\]\s*TJ/s', $stream, $matches) === 0) {
            return '';
        }

        foreach ($matches[0] as $operator) {
            if (preg_match_all('/\((?:\\\\.|[^\\\\()])*\)/s', $operator, $parts) === 0) {
                continue;
            }

            foreach ($parts[0] as $part) {
                $text .= self::pdfString(mb_substr($part, 1, mb_strlen($part) - 2));
            }

            $text .= "\n";
        }

        return $text;
    }

    /** Экранирование PDF-строк: \n, \(, \) и восьмеричные коды. */
    private static function pdfString(string $raw): string
    {
        $replacements = ['\\n' => "\n", '\\r' => "\r", '\\t' => "\t", '\\(' => '(', '\\)' => ')', '\\\\' => '\\'];
        $decoded = strtr($raw, $replacements);

        return (string) preg_replace_callback(
            '/\\\\([0-7]{1,3})/',
            static fn (array $match): string => chr((int) octdec($match[1])),
            $decoded,
        );
    }
}
