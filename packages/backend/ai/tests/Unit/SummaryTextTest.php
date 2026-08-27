<?php

declare(strict_types=1);

use Vendor\Ai\Domain\ValueObjects\SummaryText;

it('keeps a summary that already fits the window', function (): void {
    $text = str_repeat('Условия договора понятны. ', 24);

    $summary = SummaryText::clamp($text, 500, 800);

    expect($summary->length())->toBeLessThanOrEqual(800)
        ->and($summary->isWithin(500, 800))->toBeTrue()
        ->and($summary->value)->toEndWith('.');
});

it('cuts an overlong summary at a sentence boundary inside the window', function (): void {
    // 40 предложений по 25 символов — заведомо длиннее верхней границы.
    $text = str_repeat('Срок аренды один год. ', 60);

    $summary = SummaryText::clamp($text, 500, 800);

    expect($summary->isWithin(500, 800))->toBeTrue()
        ->and($summary->value)->toEndWith('год.')
        ->and(mb_substr($summary->value, -1))->not->toBe(' ');
});

it('never cuts a word in half when there is no sentence to end on', function (): void {
    $text = str_repeat('длинноесловобезточки ', 80);

    $summary = SummaryText::clamp($text, 500, 800);

    expect($summary->length())->toBeLessThanOrEqual(800)
        ->and($summary->value)->toEndWith('…')
        // Обрыв пришёлся на пробел: последнее слово целое.
        ->and(rtrim($summary->value, '…'))->toEndWith('длинноесловобезточки');
});

it('leaves a short summary as it is instead of padding it', function (): void {
    $summary = SummaryText::clamp('Коротко: договор на год.', 500, 800);

    expect($summary->value)->toBe('Коротко: договор на год.')
        ->and($summary->isWithin(500, 800))->toBeFalse();
});

it('strips control characters and refuses an empty summary', function (): void {
    expect(SummaryText::clamp("Договор\x00 на год.", 10, 800)->value)->toBe('Договор на год.');

    expect(fn () => SummaryText::clamp("   \x00 ", 10, 800))->toThrow(InvalidArgumentException::class);
});

it('accepts the exact window boundaries', function (int $length): void {
    $summary = SummaryText::clamp(str_repeat('a', $length), 500, 800);

    expect($summary->length())->toBeLessThanOrEqual(800);
})->with([500, 799, 800, 801]);
