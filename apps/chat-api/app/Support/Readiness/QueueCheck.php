<?php

declare(strict_types=1);

namespace App\Support\Readiness;

use Laravel\Horizon\Contracts\MasterSupervisorRepository;
use Throwable;

/** Horizon считается готовым, когда есть хотя бы один живой master supervisor. */
final readonly class QueueCheck implements ComponentCheck
{
    public function __construct(private MasterSupervisorRepository $masters) {}

    public function name(): string
    {
        return 'queue';
    }

    public function check(): ComponentStatus
    {
        try {
            $masters = collect($this->masters->all());

            if ($masters->isEmpty()) {
                return ComponentStatus::fail('horizon is not running');
            }

            if ($masters->every(fn (object $master): bool => ($master->status ?? null) === 'paused')) {
                return ComponentStatus::fail('horizon is paused');
            }

            return ComponentStatus::ok();
        } catch (Throwable) {
            return ComponentStatus::fail('status unavailable');
        }
    }
}
