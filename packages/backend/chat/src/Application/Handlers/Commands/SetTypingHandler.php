<?php

declare(strict_types=1);

namespace Vendor\Chat\Application\Handlers\Commands;

use Illuminate\Contracts\Events\Dispatcher;
use Vendor\Chat\Application\Commands\SetTypingCommand;
use Vendor\Chat\Domain\Contracts\PresenceRegistry;
use Vendor\Chat\Domain\Events\TypingChanged;

final readonly class SetTypingHandler
{
    public function __construct(
        private PresenceRegistry $presence,
        private Dispatcher $events,
    ) {}

    public function handle(SetTypingCommand $command): void
    {
        if ($command->isTyping) {
            $this->presence->markTyping(
                $command->roomId,
                $command->userId,
                (int) config('chat.presence.typing_ttl_seconds', 7),
            );
        } else {
            $this->presence->stopTyping($command->roomId, $command->userId);
        }

        // Активность в комнате продлевается любым сигналом набора.
        $this->presence->markActive(
            $command->roomId,
            $command->userId,
            (int) config('chat.presence.active_ttl_seconds', 60),
        );

        $this->events->dispatch(new TypingChanged($command->roomId, $command->userId, $command->isTyping));
    }
}
