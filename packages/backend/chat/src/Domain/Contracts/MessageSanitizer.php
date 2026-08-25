<?php

declare(strict_types=1);

namespace Vendor\Chat\Domain\Contracts;

use Vendor\Chat\Domain\ValueObjects\MessageBody;

interface MessageSanitizer
{
    /** @throws \InvalidArgumentException при пустом или сверхдлинном теле */
    public function sanitize(string $raw): MessageBody;

    /**
     * Пустой после очистки текст — null, а не исключение: полнота сообщения
     * решается вместе с вложениями (spec chat/rooms-and-messages).
     *
     * @throws \InvalidArgumentException при сверхдлинном теле
     */
    public function sanitizeOptional(string $raw): ?MessageBody;
}
