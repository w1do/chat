<?php

declare(strict_types=1);

namespace Vendor\Ai\Domain\Enums;

/**
 * Код отказа для клиента и аудита. Только категория: ни текста документа,
 * ни ответа поставщика (spec: no sensitive content in logs).
 */
enum FileSummaryError: string
{
    case Timeout = 'provider_timeout';
    case Unavailable = 'provider_unavailable';
    case Unreadable = 'file_unreadable';
    case Disabled = 'ai_disabled';

    /** Отказ временный: пользователю имеет смысл повторить позже. */
    public function isRetryable(): bool
    {
        return $this === self::Timeout || $this === self::Unavailable;
    }
}
