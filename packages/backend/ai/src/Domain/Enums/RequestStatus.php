<?php

declare(strict_types=1);

namespace Vendor\Ai\Domain\Enums;

enum RequestStatus: string
{
    /** Асинхронная операция записана, но поставщик ещё не ответил. */
    case Pending = 'pending';
    case Succeeded = 'succeeded';
    case Failed = 'failed';
    case TimedOut = 'timed_out';
    case Rejected = 'rejected';
    case Cancelled = 'cancelled';
}
