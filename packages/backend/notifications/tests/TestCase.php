<?php

declare(strict_types=1);

namespace Vendor\Notifications\Tests;

use Orchestra\Testbench\TestCase as TestbenchTestCase;
use Vendor\Notifications\NotificationsServiceProvider;

abstract class TestCase extends TestbenchTestCase
{
    protected function getPackageProviders($app): array
    {
        return [NotificationsServiceProvider::class];
    }
}
