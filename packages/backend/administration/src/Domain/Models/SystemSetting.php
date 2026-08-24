<?php

declare(strict_types=1);

namespace Vendor\Administration\Domain\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * @property string $key
 * @property mixed $value
 * @property ?string $updated_by
 * @property ?Carbon $updated_at
 */
class SystemSetting extends Model
{
    public $incrementing = false;

    public $timestamps = false;

    protected $table = 'system_settings';

    protected $primaryKey = 'key';

    protected $keyType = 'string';

    protected $fillable = ['key', 'value', 'updated_by', 'updated_at'];

    protected function casts(): array
    {
        return [
            'value' => 'array',
            'updated_at' => 'datetime',
        ];
    }
}
