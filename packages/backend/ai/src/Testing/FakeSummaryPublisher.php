<?php

declare(strict_types=1);

namespace Vendor\Ai\Testing;

use Illuminate\Support\Str;
use Vendor\Ai\Domain\Contracts\SummaryPublisher;
use Vendor\Ai\Domain\Contracts\SummaryPublishFailed;

/** Публикация в комнату для тестов пакета: запоминает, что было отправлено. */
final class FakeSummaryPublisher implements SummaryPublisher
{
    /** @var list<array{room_id: string, author_id: string, body: string, reply_to_id: ?string}> */
    public array $published = [];

    public function __construct(private readonly bool $failing = false) {}

    public static function failing(): self
    {
        return new self(failing: true);
    }

    public function publish(string $roomId, string $authorId, string $body, ?string $replyToId): string
    {
        if ($this->failing) {
            throw new SummaryPublishFailed('Room does not accept messages.');
        }

        $this->published[] = [
            'room_id' => $roomId,
            'author_id' => $authorId,
            'body' => $body,
            'reply_to_id' => $replyToId,
        ];

        return (string) Str::ulid();
    }
}
