<?php

declare(strict_types=1);

namespace App\Support;

use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\Exceptions\ThrottleRequestsException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Symfony\Component\HttpKernel\Exception\MethodNotAllowedHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\HttpKernel\Exception\ServiceUnavailableHttpException;
use Throwable;

/**
 * Единый JSON error envelope API: code, message, details, trace_id
 * (docs/api/error-envelope.md). API всегда отвечает JSON, включая исключения.
 */
final class ApiErrorEnvelope
{
    public static function fromThrowable(Throwable $e, Request $request): JsonResponse
    {
        $traceId = TraceId::fromRequest($request);

        [$status, $code, $message, $details, $headers] = match (true) {
            $e instanceof ValidationException => [
                422, 'validation_failed', 'The given data is invalid.', ['errors' => $e->errors()], [],
            ],
            $e instanceof AuthenticationException => [
                401, 'unauthenticated', 'Authentication is required.', [], [],
            ],
            $e instanceof AuthorizationException,
            $e instanceof AccessDeniedHttpException => [
                403, 'forbidden', 'This action is not authorized.', [], [],
            ],
            $e instanceof ModelNotFoundException,
            $e instanceof NotFoundHttpException,
            // Политика может скрыть существование ресурса (denyAsNotFound) —
            // Laravel превращает такой отказ в обычный HTTP 404.
            $e instanceof HttpExceptionInterface && $e->getStatusCode() === 404 => [
                404, 'not_found', 'The requested resource was not found.', [], [],
            ],
            $e instanceof ConflictHttpException => [
                409, 'conflict', $e->getMessage() !== '' ? $e->getMessage() : 'The request conflicts with the current state.', [], [],
            ],
            $e instanceof ThrottleRequestsException => [
                429, 'rate_limited', 'Too many requests.', [], $e->getHeaders(),
            ],
            $e instanceof MethodNotAllowedHttpException => [
                405, 'method_not_allowed', 'The HTTP method is not allowed for this endpoint.', [], $e->getHeaders(),
            ],
            $e instanceof ServiceUnavailableHttpException => [
                503, 'service_unavailable', $e->getMessage() !== '' ? $e->getMessage() : 'The service is temporarily unavailable.', [], $e->getHeaders(),
            ],
            $e instanceof HttpExceptionInterface => [
                $e->getStatusCode(), 'http_error', $e->getMessage() !== '' ? $e->getMessage() : 'HTTP error.', [], $e->getHeaders(),
            ],
            default => [
                500, 'server_error', 'An unexpected error occurred.', [], [],
            ],
        };

        return self::respond($code, $message, $status, $details, $traceId, $headers);
    }

    /**
     * @param  array<string, mixed>  $details
     * @param  array<string, string>  $headers
     */
    public static function respond(
        string $code,
        string $message,
        int $status,
        array $details = [],
        ?string $traceId = null,
        array $headers = [],
    ): JsonResponse {
        if ($traceId !== null) {
            $headers[TraceId::HEADER] = $traceId;
        }

        return new JsonResponse([
            'code' => $code,
            'message' => $message,
            'details' => $details === [] ? (object) [] : $details,
            'trace_id' => $traceId,
        ], $status, $headers);
    }
}
