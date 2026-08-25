<?php

declare(strict_types=1);

namespace Vendor\Chat\Application\Handlers\Queries;

use Vendor\Chat\Application\DTOs\MemberCandidateData;
use Vendor\Chat\Application\Queries\SearchMemberCandidatesQuery;
use Vendor\Chat\Domain\Models\RoomMember;

/**
 * Поиск людей, которых можно позвать в комнату (design 5): начало ника без
 * учёта регистра, короткий запрос не ищет вовсе, ответ ограничен десятью
 * людьми — это приглашение, а не справочник ников установки.
 */
final readonly class SearchMemberCandidatesHandler
{
    private const MIN_TERM_LENGTH = 2;

    private const LIMIT = 10;

    /** @return list<MemberCandidateData> */
    public function handle(SearchMemberCandidatesQuery $query): array
    {
        $term = mb_strtolower(ltrim(trim($query->term), '@'));

        if (mb_strlen($term) < self::MIN_TERM_LENGTH) {
            return [];
        }

        // Класс пользователя принадлежит приложению; пакет знает только
        // framework-конфиг auth-провайдера (§4.1).
        $userModel = config('auth.providers.users.model');

        $candidates = $userModel::query()
            ->whereRaw("lower(username) like ? escape '\'", [$this->prefix($term)])
            ->orderBy('username')
            ->limit(self::LIMIT)
            ->get(['id', 'username', 'name']);

        $memberIds = RoomMember::query()
            ->where('room_id', $query->roomId)
            ->whereIn('user_id', $candidates->pluck('id'))
            ->pluck('user_id')
            ->all();

        return $candidates->map(fn ($user): MemberCandidateData => new MemberCandidateData(
            id: (string) $user->getKey(),
            username: (string) $user->username,
            name: (string) $user->name,
            alreadyMember: in_array((string) $user->getKey(), $memberIds, true),
        ))->all();
    }

    /** Совпадение с начала ника; символы шаблона в запросе ничего не значат. */
    private function prefix(string $term): string
    {
        return str_replace(['\\', '%', '_'], ['\\\\', '\%', '\_'], $term).'%';
    }
}
