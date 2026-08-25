<?php

declare(strict_types=1);

namespace Vendor\Chat\Application\Commands;

final readonly class UpdateRoomCommand
{
    /**
     * @param  ?string  $name  null — название не меняется
     * @param  ?string  $topic  учитывается только при $topicProvided: описание можно и очистить
     */
    public function __construct(
        public string $roomId,
        public ?string $name = null,
        public ?string $topic = null,
        public bool $topicProvided = false,
    ) {}
}
