<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Vendor\Chat\Application\Commands\JoinByInviteCommand;
use Vendor\Chat\Application\Handlers\Commands\JoinByInviteHandler;
use Vendor\Identity\Application\Commands\CreateInvitedUserCommand;
use Vendor\Identity\Application\Handlers\Commands\CreateInvitedUserHandler;

/**
 * Приём приглашения — сценарий на стыке пакетов: комната принадлежит `chat`,
 * аккаунт — `identity`, и знать друг о друге они не должны (STRUCTURE.md §2).
 * Поэтому шаги соединяет приложение, в одной транзакции: иначе мог бы
 * остаться аккаунт без комнаты.
 */
final class InviteAcceptController extends Controller
{
    public function __invoke(
        Request $request,
        string $token,
        CreateInvitedUserHandler $createUser,
        JoinByInviteHandler $join,
    ): JsonResponse {
        $user = $request->user();

        if ($user !== null) {
            // Вошедшему второй аккаунт не нужен — только членство.
            $member = $join->handle(new JoinByInviteCommand($token, (string) $user->getAuthIdentifier()));

            return new JsonResponse(['data' => ['room_id' => $member->roomId, 'created_account' => false]]);
        }

        $name = trim((string) $request->input('name', ''));

        if ($name === '' || mb_strlen($name) > 60) {
            throw ValidationException::withMessages([
                'name' => ['Укажите, как вас зовут — это имя увидят в комнате.'],
            ]);
        }

        [$roomId] = DB::transaction(function () use ($createUser, $join, $name, $token): array {
            $created = $createUser->handle(new CreateInvitedUserCommand($name));
            $member = $join->handle(new JoinByInviteCommand($token, $created->id));

            return [$member->roomId];
        });

        return new JsonResponse(['data' => ['room_id' => $roomId, 'created_account' => true]], 201);
    }
}
