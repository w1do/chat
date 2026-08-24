<?php

declare(strict_types=1);

namespace Vendor\Chat\Domain\Models;

use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;
use Vendor\Chat\Database\Factories\RoomFactory;
use Vendor\Chat\Domain\Enums\RoomRole;
use Vendor\Chat\Domain\Enums\RoomVisibility;

/**
 * @property string $id
 * @property string $name
 * @property ?string $topic
 * @property RoomVisibility $visibility
 * @property string $created_by
 * @property ?Carbon $archived_at
 * @property ?Carbon $created_at
 */
class Room extends Model
{
    /** @use HasFactory<RoomFactory> */
    use HasFactory;

    use HasUlids;

    protected $table = 'rooms';

    protected $fillable = ['name', 'topic', 'visibility', 'created_by'];

    protected function casts(): array
    {
        return [
            'visibility' => RoomVisibility::class,
            'archived_at' => 'datetime',
        ];
    }

    /** @return HasMany<RoomMember, $this> */
    public function members(): HasMany
    {
        return $this->hasMany(RoomMember::class);
    }

    public function isPublic(): bool
    {
        return $this->visibility === RoomVisibility::PublicRoom;
    }

    public function isArchived(): bool
    {
        return $this->archived_at !== null;
    }

    public function memberFor(Authenticatable $user): ?RoomMember
    {
        return $this->members()->where('user_id', $user->getAuthIdentifier())->first();
    }

    public function roleOf(Authenticatable $user): ?RoomRole
    {
        return $this->memberFor($user)?->role;
    }

    public function hasMember(Authenticatable $user): bool
    {
        return $this->members()->where('user_id', $user->getAuthIdentifier())->exists();
    }

    /**
     * Комнаты, видимые пользователю: публичные плюс его приватные.
     *
     * @param  Builder<self>  $query
     * @return Builder<self>
     */
    public function scopeVisibleTo(Builder $query, Authenticatable $user): Builder
    {
        return $query->where(function (Builder $inner) use ($user): void {
            $inner->where('visibility', RoomVisibility::PublicRoom->value)
                ->orWhereHas('members', function (Builder $members) use ($user): void {
                    $members->where('user_id', $user->getAuthIdentifier());
                });
        });
    }

    protected static function newFactory(): RoomFactory
    {
        return RoomFactory::new();
    }
}
