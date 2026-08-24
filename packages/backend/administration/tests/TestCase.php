<?php

declare(strict_types=1);

namespace Vendor\Administration\Tests;

use Orchestra\Testbench\TestCase as TestbenchTestCase;
use Vendor\Administration\AdministrationServiceProvider;

abstract class TestCase extends TestbenchTestCase
{
    protected function getPackageProviders($app): array
    {
        return [AdministrationServiceProvider::class];
    }
}
