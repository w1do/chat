<?php

declare(strict_types=1);

namespace Vendor\Chat\Domain\Enums;

/** Что произошло в комнате; текст формулирует клиент (design 1c). */
enum SystemEvent: string
{
    case MemberJoined = 'member.joined';
    case MemberInvited = 'member.invited';
    case MemberLeft = 'member.left';
}
