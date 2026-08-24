<?php

declare(strict_types=1);

namespace App\Support\Readiness;

use Illuminate\Database\ConnectionResolverInterface;
use Throwable;

final readonly class DatabaseCheck implements ComponentCheck
{
    public function __construct(private ConnectionResolverInterface $db) {}

    public function name(): string
    {
        return 'database';
    }

    public function check(): ComponentStatus
    {
        try {
            $this->db->connection()->select('select 1');

            return ComponentStatus::ok();
        } catch (Throwable) {
            return ComponentStatus::fail('connection failed');
        }
    }
}
