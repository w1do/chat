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
use Spatie\MediaLibrary\HasMedia;
use Spatie\MediaLibrary\InteractsWithMedia;
use Spatie\MediaLibrary\MediaCollections\Models\Media;
use Vendor\Chat\Database\Factories\RoomFactory;
use Vendor\Chat\Domain\Enums\RoomKind;
use Vendor\Chat\Domain\Enums\RoomRole;
use Vendor\Chat\Domain\Enums\RoomVisibility;
use Vendor\Chat\Domain\Models\Concerns\PreparesAttachmentPreviews;
use Vendor\Chat\Domain\ValueObjects\DirectPair;

/**
 * @property string $id
 * @property string $name
 * @property ?string $topic
 * @property RoomVisibility $visibility
 * @property RoomKind $kind
 * @property ?string $direct_key
 * @property string $created_by
 * @property ?Carbon $archived_at
 * @property ?Carbon $created_at
 */
class Room extends Model implements HasMedia
{
    /** @use HasFactory<RoomFactory> */
    use HasFactory;

    use HasUlids;
    use InteractsWithMedia;
    use PreparesAttachmentPreviews;

    /** Фотография комнаты: одна, новая вытесняет прежнюю. */
    public const PHOTO = 'room-photo';

    protected $table = 'rooms';

    // Обычное создание всегда даёт комнату; диалог создаётся только своим
    // обработчиком, который задаёт вид явно.
    protected $attributes = ['kind' => 'room'];

    // kind и direct_key назначаются только обработчиками пакета: HTTP-запросы
    // их не валидируют, поэтому пользовательский ввод сюда не попадает.
    protected $fillable = ['name', 'topic', 'visibility', 'kind', 'direct_key', 'created_by'];

    protected function casts(): array
    {
        return [
            'visibility' => RoomVisibility::class,
            'kind' => RoomKind::class,
            'archived_at' => 'datetime',
        ];
    }

    /** @return HasMany<RoomMember, $this> */
    public function members(): HasMany
    {
        return $this->hasMany(RoomMember::class);
    }

    public function registerMediaCollections(): void
    {
        $this->addMediaCollection(self::PHOTO)->singleFile();
    }

    public function registerMediaConversions(?Media $media = null): void
    {
        // «Оригинал» коллекции — уже подготовленный webp; здесь только мелкий
        // размер для списка переписок.
        $this->addMediaConversion('thumb')
            ->performOnCollections(self::PHOTO)
            ->queued()
            ->format('webp')
            ->width((int) config('chat.images.photo.thumb', 128))
            ->height((int) config('chat.images.photo.thumb', 128));

        // Ещё не отправленные вложения висят на комнате (design 3): их
        // миниатюры готовятся той же конверсией, что и у сообщения.
        $this->registerAttachmentPreviewConversion();
    }

    public function photo(): ?Media
    {
        return $this->getFirstMedia(self::PHOTO);
    }

    public function isPublic(): bool
    {
        return $this->visibility === RoomVisibility::PublicRoom;
    }

    public function isArchived(): bool
    {
        return $this->archived_at !== null;
    }

    public function isDirect(): bool
    {
        return $this->kind === RoomKind::Direct;
    }

    /**
     * Собеседник в диалоге: второй идентификатор ключа пары. Не требует
     * запроса к участникам — ключ уже хранит обоих.
     */
    public function counterpartIdFor(string $userId): ?string
    {
        if (! $this->isDirect() || $this->direct_key === null) {
            return null;
        }

        return DirectPair::counterpartOf($this->direct_key, $userId);
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
