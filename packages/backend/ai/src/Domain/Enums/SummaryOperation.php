<?php

declare(strict_types=1);

namespace Vendor\Ai\Domain\Enums;

/** Операции над файлами; в аудите `ai_requests` лежат рядом с правкой текста. */
enum SummaryOperation: string
{
    case SummarizeFile = 'summarize_file';
}
