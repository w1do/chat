<?php

declare(strict_types=1);

namespace Vendor\Ai\Domain\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;
use Vendor\Ai\Domain\Enums\FileSummaryError;
use Vendor\Ai\Domain\Enums\FileSummaryStatus;
use Vendor\Ai\Domain\ValueObjects\SummaryTarget;

/**
 * Операция пересказа документа. Черновик хранится, пока человек не решил,
 * публиковать ли его: без хранения нечего показать после переподключения
 * (spec: HTTP resync). Виден он только автору запроса.
 *
 * @property string $id
 * @property string $user_id
 * @property ?string $ai_request_id
 * @property string $room_id
 * @property string $message_id
 * @property string $attachment_id
 * @property string $file_name
 * @property string $mime_type
 * @property int $file_size
 * @property ?string $idempotency_key
 * @property string $locale
 * @property FileSummaryStatus $status
 * @property ?string $summary
 * @property ?FileSummaryError $error_code
 * @property string $provider
 * @property ?string $model
 * @property int $prompt_tokens
 * @property int $completion_tokens
 * @property int $cost_minor
 * @property int $duration_ms
 * @property ?string $published_message_id
 * @property ?Carbon $created_at
 * @property ?Carbon $updated_at
 */
class AiFileSummary extends Model
{
    use HasUlids;

    protected $table = 'ai_file_summaries';

    protected $fillable = [
        'user_id',
        'ai_request_id',
        'room_id',
        'message_id',
        'attachment_id',
        'file_name',
        'mime_type',
        'file_size',
        'idempotency_key',
        'locale',
        'status',
        'summary',
        'error_code',
        'provider',
        'model',
        'prompt_tokens',
        'completion_tokens',
        'cost_minor',
        'duration_ms',
        'published_message_id',
    ];

    /** Черновик — приватный текст: наружу его выносит только Resource автору. */
    protected $hidden = ['summary'];

    protected function casts(): array
    {
        return [
            'status' => FileSummaryStatus::class,
            'error_code' => FileSummaryError::class,
        ];
    }

    public function target(): SummaryTarget
    {
        return new SummaryTarget(
            roomId: $this->room_id,
            messageId: $this->message_id,
            attachmentId: $this->attachment_id,
            fileName: $this->file_name,
            mimeType: $this->mime_type,
            size: $this->file_size,
        );
    }

    public function isOwnedBy(string $userId): bool
    {
        return $this->user_id === $userId;
    }
}
