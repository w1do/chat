<?php

declare(strict_types=1);

namespace Vendor\Administration\Application\Handlers\Queries;

use Vendor\Administration\Application\DTOs\AuditEntryData;
use Vendor\Administration\Application\Queries\ListAuditQuery;
use Vendor\Administration\Domain\Models\AuditLog;

final readonly class ListAuditHandler
{
    /** @return array{items: list<AuditEntryData>, nextCursor: ?string} */
    public function handle(ListAuditQuery $query): array
    {
        $limit = max(1, min($query->limit, 100));

        // Новые → старые; ULID задаёт стабильный порядок для cursor-пагинации.
        $rows = AuditLog::query()
            ->when($query->action !== null, fn ($q) => $q->where('action', $query->action))
            ->when($query->actorId !== null, fn ($q) => $q->where('actor_id', $query->actorId))
            ->when($query->cursor !== null, fn ($q) => $q->where('id', '<', $query->cursor))
            ->orderByDesc('id')
            ->limit($limit + 1)
            ->get();

        $hasMore = $rows->count() > $limit;
        $rows = $rows->take($limit);

        return [
            'items' => $rows->map(AuditEntryData::fromModel(...))->values()->all(),
            'nextCursor' => $hasMore ? $rows->last()?->id : null,
        ];
    }
}
