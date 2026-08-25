<?php

declare(strict_types=1);

namespace Vendor\Chat\Application\DTOs;

/**
 * Человек, которого можно позвать в комнату. Ник и имя — всё, что нужно
 * для выбора; ничего больше о людях установки приглашающему не показывают.
 */
final readonly class MemberCandidateData
{
    public function __construct(
        public string $id,
        public string $username,
        public string $name,
        public bool $alreadyMember,
    ) {}
}
