<?php

declare(strict_types=1);

namespace App\Support;

use Illuminate\Http\JsonResponse;

/**
 * Единый JSON error envelope API: code, message, details, trace_id.
 * Полное подключение к exception handler — этап 3 (задача 3.1).
 */
final class ApiErrorEnvelope
{
    /** @param array<string, mixed> $details */
    public static function respond(
        string $code,
        string $message,
        int $status,
        array $details = [],
        ?string $traceId = null,
    ): JsonResponse {
        return new JsonResponse([
            'code' => $code,
            'message' => $message,
            'details' => $details === [] ? (object) [] : $details,
            'trace_id' => $traceId,
        ], $status, $traceId !== null ? [TraceId::HEADER => $traceId] : []);
    }
}
