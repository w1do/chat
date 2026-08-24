<?php

declare(strict_types=1);

namespace Vendor\Chat\Domain\Contracts;

use Vendor\Chat\Domain\ValueObjects\IndexedMessage;

/**
 * Индекс сообщений. Приложение может заменить binding (§4.1); PostgreSQL
 * остаётся источником истины, индекс всегда перестраиваем.
 */
interface MessageIndex
{
    /** Создаёт коллекцию, если её ещё нет. */
    public function ensureCollection(): void;

    /** Удаляет и заново создаёт коллекцию — для полной переиндексации. */
    public function recreateCollection(): void;

    public function index(IndexedMessage $message): void;

    /** @param list<IndexedMessage> $messages */
    public function indexMany(array $messages): void;

    public function remove(string $messageId): void;

    /**
     * @param  list<string>  $roomIds  комнаты, к которым у пользователя есть доступ
     * @return list<string> идентификаторы найденных сообщений, релевантные первыми
     */
    public function search(string $term, array $roomIds, int $limit): array;
}
