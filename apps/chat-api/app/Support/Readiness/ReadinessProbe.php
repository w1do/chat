<?php

declare(strict_types=1);

namespace App\Support\Readiness;

final readonly class ReadinessProbe
{
    /** @param list<ComponentCheck> $checks */
    public function __construct(private array $checks) {}

    /** @return array{ready: bool, payload: array<string, mixed>} */
    public function run(): array
    {
        $components = [];
        $ready = true;

        foreach ($this->checks as $check) {
            $status = $check->check();
            $components[$check->name()] = $status->toArray();
            $ready = $ready && $status->isOk();
        }

        return [
            'ready' => $ready,
            'payload' => [
                'status' => $ready ? 'ok' : 'degraded',
                'components' => $components,
            ],
        ];
    }
}
