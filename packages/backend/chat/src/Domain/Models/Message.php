<?php

declare(strict_types=1);

namespace Vendor\Chat\Domain\Models;

use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;
use Vendor\Chat\Database\Factories\MessageFactory;

/**
 * @property string $id
 * @property string $room_id
 * @property string $author_id
 * @property ?string $reply_to_id
 * @property string $body
 * @property ?list<string> $mentions
 * @property ?Carbon $edited_at
 * @property ?Carbon $deleted_at
 * @property ?Carbon $created_at
 */
class Message extends Model
{
    /** @use HasFactory<MessageFactory> */
    use HasFactory;

    use HasUlids;
    use SoftDeletes;

    protected $table = 'messages';

    protected $fillable = ['room_id', 'author_id', 'reply_to_id', 'body', 'mentions'];

    protected function casts(): array
    {
        return [
            'mentions' => 'array',
            'edited_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<Room, $this> */
    public function room(): BelongsTo
    {
        return $this->belongsTo(Room::class);
    }

    /** @return BelongsTo<self, $this> */
    public function replyTo(): BelongsTo
    {
        return $this->belongsTo(self::class, 'reply_to_id');
    }

    /** @return HasMany<MessageReaction, $this> */
    public function reactions(): HasMany
    {
        return $this->hasMany(MessageReaction::class);
    }

    public function isAuthoredBy(Authenticatable $user): bool
    {
        return $this->author_id === (string) $user->getAuthIdentifier();
    }

    public function isWithinEditWindow(int $minutes): bool
    {
        return $this->created_at !== null && $this->created_at->diffInMinutes(now()) < $minutes;
    }

    protected static function newFactory(): MessageFactory
    {
        return MessageFactory::new();
    }
}
