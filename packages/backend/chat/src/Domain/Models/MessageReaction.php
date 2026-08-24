<?php

declare(strict_types=1);

namespace Vendor\Chat\Domain\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Vendor\Chat\Database\Factories\MessageReactionFactory;

/**
 * @property string $id
 * @property string $message_id
 * @property string $user_id
 * @property string $emoji
 */
class MessageReaction extends Model
{
    /** @use HasFactory<MessageReactionFactory> */
    use HasFactory;

    use HasUlids;

    protected $table = 'message_reactions';

    protected $fillable = ['message_id', 'user_id', 'emoji'];

    protected static function newFactory(): MessageReactionFactory
    {
        return MessageReactionFactory::new();
    }
}
