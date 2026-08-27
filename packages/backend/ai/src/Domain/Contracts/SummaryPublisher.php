<?php

declare(strict_types=1);

namespace Vendor\Ai\Domain\Contracts;

/**
 * Публикация готового пересказа в комнату. Реализует приложение через
 * обычную отправку сообщения: авторство остаётся у человека, а события
 * комнаты — штатные (design 1).
 */
interface SummaryPublisher
{
    /**
     * @return string идентификатор созданного сообщения
     *
     * @throws SummaryPublishFailed когда комната больше не принимает сообщения
     */
    public function publish(string $roomId, string $authorId, string $body, ?string $replyToId): string;
}
