<?php

declare(strict_types=1);

namespace Vendor\Chat\Application\Queries;

final readonly class SearchMemberCandidatesQuery
{
    public function __construct(
        /** null — поиск собеседника для диалога: комнаты ещё нет. */
        public ?string $roomId,
        public string $term,
        /** Кого не предлагать: для диалога — самого ищущего. */
        public ?string $excludeUserId = null,
    ) {}
}
