<?php

namespace App\Http\Requests;

/**
 * @OA\RequestBody(
 *     request="UpdateProfileRequest",
 *     required=true,
 *     @OA\JsonContent(
 *         required={"name", "email"},
 *         @OA\Property(property="name", type="string", example="Иван Иванов"),
 *         @OA\Property(property="email", type="string", format="email", example="ivan@example.com"),
 *         @OA\Property(property="settings", type="object", example={"theme": "dark"})
 *     )
 * )
 */
class UpdateProfileRequest extends FormRequest
{
    // ...
}

/**
 * @OA\Schema(
 *     schema="UserResource",
 *     @OA\Property(property="id", type="integer", example=1),
 *     @OA\Property(property="name", type="string", example="Иван Иванов"),
 *     @OA\Property(property="email", type="string", example="ivan@example.com")
 * )
 */
class UserResource extends JsonResource
{
    // ...
}
