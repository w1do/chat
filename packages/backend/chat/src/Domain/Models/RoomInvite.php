<?php

declare(strict_types=1);

namespace Vendor\Chat\Domain\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * Ссылка-приглашение в комнату.
 *
 * @property string $id
 * @property string $room_id
 * @property string $created_by
 * @property string $token_hash
 * @property Carbon $expires_at
 * @property ?Carbon $revoked_at
 * @property int $uses
 * @property ?Carbon $last_used_at
 */
class RoomInvite extends Model
{
    use HasUlids;

    protected $table = 'room_invites';

    protected $fillable = ['room_id', 'created_by', 'token_hash', 'expires_at', 'revoked_at', 'uses', 'last_used_at'];

    /** Хэш токена наружу не отдаётся: по нему восстанавливают ссылку. */
    protected $hidden = ['token_hash'];

    protected function casts(): array
    {
        return [
            'expires_at' => 'datetime',
            'revoked_at' => 'datetime',
            'last_used_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<Room, $this> */
    public function room(): BelongsTo
    {
        return $this->belongsTo(Room::class);
    }

    public function isUsable(): bool
    {
        return $this->revoked_at === null && $this->expires_at->isFuture();
    }

    /** Токен ищем по хэшу: в базе самого токена нет. */
    public static function hashToken(string $token): string
    {
        return hash('sha256', $token);
    }
}
