<?php

declare(strict_types=1);

namespace Vendor\Identity\Tests;

use Orchestra\Testbench\TestCase as TestbenchTestCase;
use Vendor\Identity\IdentityServiceProvider;

abstract class TestCase extends TestbenchTestCase
{
    protected function getPackageProviders($app): array
    {
        return [IdentityServiceProvider::class];
    }
}
