<?php

declare(strict_types=1);

namespace Vendor\Administration\Domain\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * @property string $id
 * @property ?string $actor_id
 * @property ?string $actor_label
 * @property string $action
 * @property ?string $subject_type
 * @property ?string $subject_id
 * @property ?array<string, mixed> $context
 * @property Carbon $created_at
 */
class AuditLog extends Model
{
    use HasUlids;

    public $timestamps = false;

    protected $table = 'audit_logs';

    protected $fillable = ['actor_id', 'actor_label', 'action', 'subject_type', 'subject_id', 'context', 'created_at'];

    protected function casts(): array
    {
        return [
            'context' => 'array',
            'created_at' => 'datetime',
        ];
    }
}
