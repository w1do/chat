<?php

declare(strict_types=1);

use Vendor\Ai\Domain\Contracts\UnreadableDocument;
use Vendor\Ai\Infrastructure\Files\DocumentTextExtractor;

function extractor(): DocumentTextExtractor
{
    return new DocumentTextExtractor;
}

/** Настоящий DOCX: zip с word/document.xml, как его пишет редактор. */
function docxBytes(string $text): string
{
    $file = tempnam(sys_get_temp_dir(), 'docx-test-');
    $zip = new ZipArchive;
    $zip->open((string) $file, ZipArchive::OVERWRITE);
    $zip->addFromString('word/document.xml', '<?xml version="1.0"?><w:document><w:body><w:p><w:r><w:t>'.$text.'</w:t></w:r></w:p></w:body></w:document>');
    $zip->close();

    $bytes = (string) file_get_contents((string) $file);
    @unlink((string) $file);

    return $bytes;
}

/** Минимальный PDF с текстовым слоем и несжатым потоком содержимого. */
function pdfBytes(string $text): string
{
    return "%PDF-1.4\n1 0 obj\n<< /Length 44 >>\nstream\nBT /F1 12 Tf ({$text}) Tj ET\nendstream\nendobj\ntrailer\n<< >>\n%%EOF\n";
}

it('reads plain text as it is', function (): void {
    expect(extractor()->extract("Договор  аренды\nна год", 'text/plain', 'txt'))
        ->toBe("Договор аренды\nна год");
});

it('converts non-utf8 plain text instead of sending garbage to the provider', function (): void {
    $cp1251 = (string) mb_convert_encoding('Договор', 'Windows-1251', 'UTF-8');

    expect(extractor()->extract($cp1251, 'text/plain', 'txt'))->toBe('Договор');
});

it('reads the text of a docx document', function (): void {
    $bytes = docxBytes('Срок аренды — один год');

    expect(extractor()->extract($bytes, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'docx'))
        ->toContain('Срок аренды — один год');
});

it('reads the text layer of a pdf document', function (): void {
    expect(extractor()->extract(pdfBytes('Akt priyoma peredachi'), 'application/pdf', 'pdf'))
        ->toContain('Akt priyoma peredachi');
});

it('refuses a pdf without a text layer', function (): void {
    $scan = "%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< >>\n%%EOF\n";

    expect(fn () => extractor()->extract($scan, 'application/pdf', 'pdf'))
        ->toThrow(UnreadableDocument::class);
});

it('refuses a file that only pretends to be a pdf', function (): void {
    expect(fn () => extractor()->extract('not a pdf at all', 'application/pdf', 'pdf'))
        ->toThrow(UnreadableDocument::class);
});

it('refuses an empty document', function (): void {
    expect(fn () => extractor()->extract("   \n\t ", 'text/plain', 'txt'))
        ->toThrow(UnreadableDocument::class);
});
