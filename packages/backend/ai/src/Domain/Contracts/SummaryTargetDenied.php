<?php

declare(strict_types=1);

namespace Vendor\Ai\Domain\Contracts;

use RuntimeException;

/**
 * Читатель не участник комнаты или сообщение ему не показано. Отдельный
 * флаг hidden: чужой личной переписки для постороннего не существует —
 * ответ 404, а не 403 (chat MessagePolicy).
 */
final class SummaryTargetDenied extends RuntimeException
{
    public function __construct(
        string $message = 'Message is not available to this user.',
        public readonly bool $hidden = false,
    ) {
        parent::__construct($message);
    }

    public static function hidden(): self
    {
        return new self('Message not found.', hidden: true);
    }
}
