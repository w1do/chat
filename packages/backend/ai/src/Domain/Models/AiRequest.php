<?php

declare(strict_types=1);

namespace Vendor\Ai\Domain\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;
use Vendor\Ai\Domain\Enums\RequestStatus;
use Vendor\Ai\Domain\Enums\RevisionOperation;

/**
 * Аудит обращения к AI: операция, поставщик, модель, статус, расход.
 * Ни промпт, ни ответ, ни секреты здесь не хранятся (spec: privacy defaults).
 *
 * @property string $id
 * @property string $user_id
 * @property RevisionOperation $operation
 * @property string $provider
 * @property ?string $model
 * @property RequestStatus $status
 * @property int $prompt_tokens
 * @property int $completion_tokens
 * @property int $cost_minor
 * @property int $input_length
 * @property int $duration_ms
 * @property ?string $failure_reason
 * @property ?Carbon $created_at
 */
class AiRequest extends Model
{
    use HasUlids;

    protected $table = 'ai_requests';

    protected $fillable = [
        'user_id',
        'operation',
        'provider',
        'model',
        'status',
        'prompt_tokens',
        'completion_tokens',
        'cost_minor',
        'input_length',
        'duration_ms',
        'failure_reason',
    ];

    protected function casts(): array
    {
        return [
            'operation' => RevisionOperation::class,
            'status' => RequestStatus::class,
        ];
    }
}
