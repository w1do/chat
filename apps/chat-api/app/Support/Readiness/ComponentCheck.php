<?php

declare(strict_types=1);

namespace App\Support\Readiness;

interface ComponentCheck
{
    public function name(): string;

    public function check(): ComponentStatus;
}
