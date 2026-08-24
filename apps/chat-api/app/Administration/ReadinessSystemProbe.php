<?php

declare(strict_types=1);

namespace App\Administration;

use App\Support\Readiness\ReadinessProbe;
use Vendor\Administration\Domain\Contracts\SystemProbe;

/**
 * Состояние зависимостей для админ-панели берётся из той же readiness-проверки,
 * что и `/api/v1/readiness`: два источника правды разошлись бы.
 */
final readonly class ReadinessSystemProbe implements SystemProbe
{
    public function __construct(private ReadinessProbe $probe) {}

    public function components(): array
    {
        /** @var array<string, array{status: string, detail?: string}> $components */
        $components = $this->probe->run()['payload']['components'];

        return $components;
    }
}
