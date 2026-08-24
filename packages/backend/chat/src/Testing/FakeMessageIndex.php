<?php

declare(strict_types=1);

namespace Vendor\Chat\Testing;

use Vendor\Chat\Domain\Contracts\MessageIndex;
use Vendor\Chat\Domain\Contracts\SearchUnavailable;
use Vendor\Chat\Domain\ValueObjects\IndexedMessage;

/** Индекс в памяти для тестов: подстрочный поиск вместо полнотекстового. */
final class FakeMessageIndex implements MessageIndex
{
    /** @var array<string, array<string, mixed>> */
    public array $documents = [];

    public bool $recreated = false;

    public bool $unavailable = false;

    public function ensureCollection(): void
    {
        $this->guard();
    }

    public function recreateCollection(): void
    {
        $this->guard();
        $this->documents = [];
        $this->recreated = true;
    }

    public function index(IndexedMessage $message): void
    {
        $this->guard();
        $this->documents[$message->id] = $message->toDocument();
    }

    public function indexMany(array $messages): void
    {
        foreach ($messages as $message) {
            $this->index($message);
        }
    }

    public function remove(string $messageId): void
    {
        $this->guard();
        unset($this->documents[$messageId]);
    }

    public function search(string $term, array $roomIds, int $limit): array
    {
        $this->guard();

        $hits = [];

        foreach ($this->documents as $id => $document) {
            if (! in_array($document['room_id'], $roomIds, true)) {
                continue;
            }

            if (mb_stripos((string) $document['body'], $term) === false) {
                continue;
            }

            $hits[$id] = (int) $document['created_at'];
        }

        arsort($hits);

        return array_slice(array_keys($hits), 0, $limit);
    }

    private function guard(): void
    {
        if ($this->unavailable) {
            throw SearchUnavailable::unreachable();
        }
    }
}
