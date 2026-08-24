<?php

declare(strict_types=1);

namespace App\Support\Readiness;

/** Проверка компонента TCP-подключением (Reverb/WebSocket). Хост наружу не раскрывается. */
final readonly class TcpCheck implements ComponentCheck
{
    public function __construct(
        private string $componentName,
        private string $host,
        private int $port,
        private float $timeout = 1.0,
    ) {}

    public function name(): string
    {
        return $this->componentName;
    }

    public function check(): ComponentStatus
    {
        $socket = @fsockopen($this->host, $this->port, $errorCode, $errorMessage, $this->timeout);

        if ($socket === false) {
            return ComponentStatus::fail('unreachable');
        }

        fclose($socket);

        return ComponentStatus::ok();
    }
}
