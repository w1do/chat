<?php

declare(strict_types=1);

namespace Vendor\Ai\Tests;

use Orchestra\Testbench\TestCase as TestbenchTestCase;
use Vendor\Ai\AiServiceProvider;

abstract class TestCase extends TestbenchTestCase
{
    protected function getPackageProviders($app): array
    {
        return [AiServiceProvider::class];
    }
}
