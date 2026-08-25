<?php

declare(strict_types=1);

namespace Vendor\Chat\Application\Handlers\Queries;

use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Vendor\Chat\Application\DTOs\InviteData;
use Vendor\Chat\Application\Queries\GetInviteQuery;
use Vendor\Chat\Domain\Models\RoomInvite;

/**
 * Сведения о приглашении для экрана перехода: куда зовут и кто. Ничего
 * лишнего — ни истории комнаты, ни списка участников.
 */
final readonly class GetInviteHandler
{
    public function handle(GetInviteQuery $query): InviteData
    {
        /** @var ?RoomInvite $invite */
        $invite = RoomInvite::query()
            ->with('room')
            ->where('token_hash', RoomInvite::hashToken($query->token))
            ->first();

        if ($invite === null || ! $invite->isUsable()) {
            throw new NotFoundHttpException('Invite is not available.');
        }

        $userModel = config('auth.providers.users.model');
        $invitedBy = $userModel::query()->whereKey($invite->created_by)->value('name');

        return InviteData::fromModel($invite, invitedByName: $invitedBy);
    }
}
