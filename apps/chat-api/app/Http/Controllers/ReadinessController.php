<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Support\Readiness\ReadinessProbe;
use Illuminate\Http\JsonResponse;

final class ReadinessController extends Controller
{
    public function __invoke(ReadinessProbe $probe): JsonResponse
    {
        $result = $probe->run();

        return new JsonResponse($result['payload'], $result['ready'] ? 200 : 503);
    }
}
