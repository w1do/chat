<?php

declare(strict_types=1);

namespace Vendor\Chat\Domain\Enums;

/**
 * Вид переписки. Отдельная ось от visibility: та отвечает «кто может видеть
 * и вступить», вид — «комната это или личный диалог» (design 1). Вид задаётся
 * при создании и не меняется.
 */
enum RoomKind: string
{
    case Room = 'room';
    case Direct = 'direct';
}
