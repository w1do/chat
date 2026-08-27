<?php

declare(strict_types=1);

namespace Vendor\Ai\Domain\Contracts;

use Vendor\Ai\Domain\ValueObjects\SummaryTarget;

/**
 * Мост к переписке: пакет ai не знает ни моделей чата, ни его таблиц
 * (§4.1). Связывает контракт с реализацией приложение-композиция.
 */
interface SummarySource
{
    /**
     * Документ, приложенный к сообщению, — если читатель вправе его видеть.
     *
     * @throws SummaryTargetDenied когда сообщение или файл недоступны читателю
     * @throws SummaryTargetUnsupported когда подходящего документа нет
     */
    public function locate(string $userId, string $messageId): SummaryTarget;

    /**
     * Байты документа для обращения к поставщику.
     *
     * @throws UnreadableDocument когда файл исчез из хранилища
     */
    public function read(string $attachmentId): string;

    /** Язык переписки: на нём поставщик и отвечает (spec: locale-respecting). */
    public function localeFor(string $roomId): ?string;
}
