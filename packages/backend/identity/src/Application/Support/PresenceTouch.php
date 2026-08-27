<?php

declare(strict_types=1);

namespace Vendor\Identity\Application\Support;

use Illuminate\Contracts\Cache\Repository as Cache;
use Illuminate\Database\Eloquent\Model;

/**
 * Отметка активности человека. Каждый запрос в базу не пишет: между записями
 * держится окно (design, риск 1), а «в сети» и так выводится из времени с
 * запасом. Состояния между запросами не хранит — безопасна под Octane.
 */
final readonly class PresenceTouch
{
    public function __construct(private Cache $cache) {}

    /** @return bool записали ли метку в базу (false — попали в окно троттлинга) */
    public function touch(Model $user): bool
    {
        $throttle = (int) config('identity.presence.touch_throttle_seconds', 60);
        $key = 'identity:last-seen:'.$user->getKey();

        // add() атомарен: параллельные запросы одного человека не устроят
        // гонку из нескольких UPDATE.
        if ($throttle > 0 && ! $this->cache->add($key, 1, $throttle)) {
            return false;
        }

        $user->forceFill(['last_seen_at' => now()])->saveQuietly();

        return true;
    }
}
