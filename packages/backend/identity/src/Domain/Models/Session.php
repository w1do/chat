<?php

declare(strict_types=1);

namespace Vendor\Identity\Domain\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Read-only отображение framework-таблицы sessions (для управления
 * активными сессиями пользователя). Таблицу создаёт приложение.
 */
class Session extends Model
{
    protected $table = 'sessions';

    public $incrementing = false;

    public $timestamps = false;

    protected $keyType = 'string';

    protected $guarded = ['*'];
}
