<?php

declare(strict_types=1);

namespace Vendor\Chat\Infrastructure\Search;

use Vendor\Chat\Domain\Contracts\MessageIndex;
use Vendor\Chat\Domain\Contracts\SearchUnavailable;
use Vendor\Chat\Domain\ValueObjects\IndexedMessage;

/** Поиск выключен: запись молча пропускается, чтение честно отвечает 503. */
final class NullMessageIndex implements MessageIndex
{
    public function ensureCollection(): void {}

    public function recreateCollection(): void {}

    public function index(IndexedMessage $message): void {}

    public function indexMany(array $messages): void {}

    public function remove(string $messageId): void {}

    public function search(string $term, array $roomIds, int $limit): array
    {
        throw SearchUnavailable::disabled();
    }
}
