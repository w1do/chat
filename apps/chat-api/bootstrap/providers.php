<?php

declare(strict_types=1);

use App\Providers\AppServiceProvider;
use App\Providers\BroadcastServiceProvider;
use App\Providers\PackageWiringProvider;

return [
    AppServiceProvider::class,
    BroadcastServiceProvider::class,
    PackageWiringProvider::class,
];
