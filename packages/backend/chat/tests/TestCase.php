<?php

declare(strict_types=1);

namespace Vendor\Chat\Tests;

use Orchestra\Testbench\TestCase as TestbenchTestCase;
use Vendor\Chat\ChatServiceProvider;

abstract class TestCase extends TestbenchTestCase
{
    protected function getPackageProviders($app): array
    {
        return [ChatServiceProvider::class];
    }
}
