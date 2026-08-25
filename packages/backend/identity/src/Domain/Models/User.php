<?php

declare(strict_types=1);

namespace Vendor\Identity\Domain\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Carbon;
use Laravel\Sanctum\HasApiTokens;
use Spatie\MediaLibrary\HasMedia;
use Spatie\MediaLibrary\InteractsWithMedia;
use Spatie\MediaLibrary\MediaCollections\Models\Media;
use Vendor\Identity\Application\Support\AvatarUrl;
use Vendor\Identity\Database\Factories\UserFactory;
use Vendor\SharedKernel\Contracts\Actor;

/**
 * Базовая модель пользователя.
 *
 * @property string $id
 * @property string $username
 * @property string $name
 * @property ?int $avatar_media_id
 * @property ?string $email
 * @property string $locale
 * @property string $timezone
 * @property ?Carbon $email_verified_at
 * @property ?Carbon $password_set_at
 * @property ?Carbon $created_at
 * @property string $password
 *                            Приложение наследует её в App\Models\User
 *                            и подставляет класс через config('identity.user_model') (STRUCTURE.md §2);
 *                            другие пакеты зависят только от контракта Actor.
 */
class User extends Authenticatable implements Actor, HasMedia
{
    use HasApiTokens;

    /** @use HasFactory<UserFactory> */
    use HasFactory;

    use HasUlids;
    use InteractsWithMedia;
    use Notifiable;

    /** Набор аватарок человека; какая из них показывается — в avatar_media_id. */
    public const AVATARS = 'avatars';

    /** Личные обои переписки: одна картинка, новая вытесняет прежнюю. */
    public const WALLPAPER = 'wallpaper';

    protected $table = 'users';

    protected $fillable = [
        'username',
        'name',
        'email',
        'password',
        'locale',
        'timezone',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'password_set_at' => 'datetime',
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    public function externalId(): string
    {
        return (string) $this->getKey();
    }

    public function displayName(): string
    {
        return (string) $this->name;
    }

    public function avatarUrl(): ?string
    {
        return AvatarUrl::thumb($this);
    }

    public function registerMediaCollections(): void
    {
        $this->addMediaCollection(self::AVATARS);
        // Обои одни: новые вытесняют прежние вместе с файлами.
        $this->addMediaCollection(self::WALLPAPER)->singleFile();
    }

    public function registerMediaConversions(?Media $media = null): void
    {
        // «Оригинал» коллекции — уже подготовленный webp (design 6); здесь
        // добавляется только мелкий размер для списков и лент.
        $this->addMediaConversion('thumb')
            ->performOnCollections(self::AVATARS)
            ->queued()
            ->format('webp')
            ->width((int) config('identity.images.avatar.thumb', 128))
            ->height((int) config('identity.images.avatar.thumb', 128));
    }

    /** Аватарка, которая показывается сейчас. */
    public function currentAvatar(): ?Media
    {
        if ($this->avatar_media_id === null) {
            return null;
        }

        return $this->getMedia(self::AVATARS)
            ->firstWhere(fn (Media $media): bool => $media->getKey() === $this->avatar_media_id);
    }

    public function wallpaper(): ?Media
    {
        return $this->getFirstMedia(self::WALLPAPER);
    }

    protected static function newFactory(): UserFactory
    {
        return UserFactory::new();
    }
}
