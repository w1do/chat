<?php

namespace App\Http\Controllers\Api;

use App\Domain\User\Commands\UpdateUserCommand;
use App\Domain\User\Handlers\UpdateUserHandler;
use App\Domain\User\DTO\UpdateProfileDTO;
use App\Http\Requests\UpdateProfileRequest;
use App\Http\Resources\UserResource;
use Illuminate\Http\JsonResponse;

/**
 * Пример тонкого контроллера. 
 * Вся логика вынесена в FormRequest, DTO и Handler.
 */
class UserController extends Controller
{
    /**
     * @OA\Put(
     *     path="/api/user/profile",
     *     summary="Обновить профиль пользователя",
     *     @OA\RequestBody(ref="#/components/requestBodies/UpdateProfileRequest"),
     *     @OA\Response(response=200, ref="#/components/responses/UserResource")
     * )
     */
    public function update(
        UpdateProfileRequest $request, 
        UpdateUserHandler $handler
    ): JsonResponse {
        // 1. Валидация происходит автоматически в UpdateProfileRequest
        
        // 2. Сборка DTO из запроса
        $dto = UpdateProfileDTO::fromArray($request->validated());
        
        // 3. Вызов бизнес-логики через Command/Handler (или Action)
        $user = $handler->handle(new UpdateUserCommand(
            userId: auth()->id(),
            dto: $dto
        ));

        // 4. Возврат ответа через API Resource
        return response()->json(new UserResource($user));
    }
}
