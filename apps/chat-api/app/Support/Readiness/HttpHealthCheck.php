<?php

declare(strict_types=1);

namespace App\Support\Readiness;

use Illuminate\Http\Client\Factory as HttpFactory;
use Throwable;

/** Проверка компонента HTTP health-запросом (Typesense). URL наружу не раскрывается. */
final readonly class HttpHealthCheck implements ComponentCheck
{
    public function __construct(
        private HttpFactory $http,
        private string $componentName,
        private string $url,
        private float $timeout = 2.0,
    ) {}

    public function name(): string
    {
        return $this->componentName;
    }

    public function check(): ComponentStatus
    {
        try {
            $response = $this->http->timeout($this->timeout)->connectTimeout($this->timeout)->get($this->url);

            return $response->successful()
                ? ComponentStatus::ok()
                : ComponentStatus::fail('unhealthy response');
        } catch (Throwable) {
            return ComponentStatus::fail('unreachable');
        }
    }
}
