<?php

declare(strict_types=1);

namespace Vendor\Ai\Testing;

use Vendor\Ai\Domain\Contracts\SummarySource;
use Vendor\Ai\Domain\Contracts\SummaryTargetDenied;
use Vendor\Ai\Domain\Contracts\SummaryTargetUnsupported;
use Vendor\Ai\Domain\Contracts\UnreadableDocument;
use Vendor\Ai\Domain\ValueObjects\SummaryTarget;

/**
 * Переписка для тестов пакета: ai не знает моделей чата, поэтому и в тестах
 * его связывают контрактом, а не таблицами соседнего пакета (§4.1).
 */
final class FakeSummarySource implements SummarySource
{
    /** @var array<string, SummaryTarget> */
    public array $targets = [];

    /** @var array<string, string> */
    public array $files = [];

    public bool $denied = false;

    public bool $hidden = false;

    public bool $unsupported = false;

    public ?string $locale = null;

    public function add(SummaryTarget $target, string $contents = 'Договор аренды. Срок — один год.'): self
    {
        $this->targets[$target->messageId] = $target;
        $this->files[$target->attachmentId] = $contents;

        return $this;
    }

    public function locate(string $userId, string $messageId): SummaryTarget
    {
        if ($this->denied || $this->hidden) {
            throw $this->hidden ? SummaryTargetDenied::hidden() : new SummaryTargetDenied;
        }

        if ($this->unsupported || ! isset($this->targets[$messageId])) {
            throw new SummaryTargetUnsupported('У сообщения нет подходящего документа.');
        }

        return $this->targets[$messageId];
    }

    public function read(string $attachmentId): string
    {
        return $this->files[$attachmentId] ?? throw new UnreadableDocument;
    }

    public function localeFor(string $roomId): ?string
    {
        return $this->locale;
    }
}
