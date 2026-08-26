<?php

declare(strict_types=1);

namespace Vendor\Chat\Domain\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;
use Vendor\Chat\Database\Factories\RoomMemberFactory;
use Vendor\Chat\Domain\Enums\RoomRole;

/**
 * @property string $id
 * @property string $room_id
 * @property string $user_id
 * @property RoomRole $role
 * @property Carbon $joined_at
 * @property ?string $last_read_message_id
 * @property ?Carbon $hidden_at
 */
class RoomMember extends Model
{
    /** @use HasFactory<RoomMemberFactory> */
    use HasFactory;

    use HasUlids;

    protected $table = 'room_members';

    protected $fillable = ['room_id', 'user_id', 'role', 'joined_at', 'hidden_at'];

    protected function casts(): array
    {
        return [
            'role' => RoomRole::class,
            'joined_at' => 'datetime',
            'hidden_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<Room, $this> */
    public function room(): BelongsTo
    {
        return $this->belongsTo(Room::class);
    }

    protected static function newFactory(): RoomMemberFactory
    {
        return RoomMemberFactory::new();
    }
}
