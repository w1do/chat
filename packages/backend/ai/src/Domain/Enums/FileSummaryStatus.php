<?php

declare(strict_types=1);

namespace Vendor\Ai\Domain\Enums;

/** Жизненный цикл операции пересказа: от очереди до публикации в комнату. */
enum FileSummaryStatus: string
{
    case Pending = 'pending';
    case Processing = 'processing';
    case Succeeded = 'succeeded';
    case Failed = 'failed';
    case Published = 'published';

    /** Операция завершилась — повторять её нечем и незачем. */
    public function isFinal(): bool
    {
        return $this === self::Failed || $this === self::Published;
    }

    /** Черновик готов и его можно опубликовать. */
    public function isPublishable(): bool
    {
        return $this === self::Succeeded;
    }

    /** Ход выполнения в процентах для индикатора у запросившего. */
    public function progress(): int
    {
        return match ($this) {
            self::Pending => 0,
            self::Processing => 50,
            default => 100,
        };
    }
}
