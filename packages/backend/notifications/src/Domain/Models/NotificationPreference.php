<?php

declare(strict_types=1);

namespace Vendor\Notifications\Domain\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Vendor\Notifications\Domain\Enums\Category;
use Vendor\Notifications\Domain\Enums\Channel;

/**
 * @property string $id
 * @property string $user_id
 * @property Category $category
 * @property Channel $channel
 * @property bool $enabled
 */
class NotificationPreference extends Model
{
    use HasUlids;

    protected $table = 'notification_preferences';

    protected $fillable = ['user_id', 'category', 'channel', 'enabled'];

    protected function casts(): array
    {
        return [
            'category' => Category::class,
            'channel' => Channel::class,
            'enabled' => 'boolean',
        ];
    }
}
