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
use Spatie\MediaLibrary\HasMedia;
use Spatie\MediaLibrary\InteractsWithMedia;
use Spatie\MediaLibrary\MediaCollections\Models\Collections\MediaCollection;
use Spatie\MediaLibrary\MediaCollections\Models\Media;
use Vendor\Chat\Database\Factories\MessageFactory;
use Vendor\Chat\Domain\Enums\MessageKind;
use Vendor\Chat\Domain\Models\Concerns\PreparesAttachmentPreviews;

/**
 * @property string $id
 * @property string $room_id
 * @property MessageKind $kind
 * @property ?array<string, mixed> $payload
 * @property string $author_id
 * @property ?string $reply_to_id
 * @property string $body
 * @property ?list<string> $mentions
 * @property ?Carbon $edited_at
 * @property ?Carbon $deleted_at
 * @property ?Carbon $created_at
 */
class Message extends Model implements HasMedia
{
    /** @use HasFactory<MessageFactory> */
    use HasFactory;

    use HasUlids;
    use InteractsWithMedia;
    use PreparesAttachmentPreviews;
    use SoftDeletes;

    /** Вложения сообщения: файлы в объектном хранилище под uploads/. */
    public const ATTACHMENTS = 'attachments';

    /** Имя конверсии-миниатюры для изображений-вложений. */
    public const ATTACHMENT_PREVIEW = 'preview';

    protected $table = 'messages';

    protected $fillable = ['room_id', 'kind', 'author_id', 'reply_to_id', 'body', 'mentions', 'payload'];

    protected function casts(): array
    {
        return [
            'kind' => MessageKind::class,
            'mentions' => 'array',
            'payload' => 'array',
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

    public function registerMediaCollections(): void
    {
        $this->addMediaCollection(self::ATTACHMENTS);
    }

    public function registerMediaConversions(?Media $media = null): void
    {
        $this->registerAttachmentPreviewConversion();
    }

    /** @return MediaCollection<int, Media> */
    public function attachments(): MediaCollection
    {
        return $this->getMedia(self::ATTACHMENTS);
    }

    public function isSystem(): bool
    {
        return $this->kind->isSystem();
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
