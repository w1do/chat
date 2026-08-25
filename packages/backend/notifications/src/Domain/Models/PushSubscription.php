<?php

declare(strict_types=1);

namespace Vendor\Notifications\Domain\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * Подписка устройства на Web Push.
 *
 * @property string $id
 * @property string $user_id
 * @property string $endpoint
 * @property string $endpoint_hash
 * @property string $p256dh
 * @property string $auth
 * @property ?string $user_agent
 * @property ?Carbon $last_used_at
 */
class PushSubscription extends Model
{
    use HasUlids;

    protected $table = 'push_subscriptions';

    protected $fillable = ['user_id', 'endpoint', 'endpoint_hash', 'p256dh', 'auth', 'user_agent', 'last_used_at'];

    protected $hidden = ['p256dh', 'auth'];

    protected function casts(): array
    {
        return ['last_used_at' => 'datetime'];
    }

    /** Endpoint длинный и разный по длине — уникальность держим на его хэше. */
    public static function hashEndpoint(string $endpoint): string
    {
        return hash('sha256', $endpoint);
    }
}
