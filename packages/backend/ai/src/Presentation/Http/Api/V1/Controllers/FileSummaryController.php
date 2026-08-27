<?php

declare(strict_types=1);

namespace Vendor\Ai\Presentation\Http\Api\V1\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use InvalidArgumentException;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\HttpKernel\Exception\TooManyRequestsHttpException;
use Vendor\Ai\Application\AiUnavailable;
use Vendor\Ai\Application\Commands\PublishFileSummaryCommand;
use Vendor\Ai\Application\Commands\SummarizeFileCommand;
use Vendor\Ai\Application\Handlers\Commands\PublishFileSummaryHandler;
use Vendor\Ai\Application\Handlers\Commands\SummarizeFileHandler;
use Vendor\Ai\Application\Handlers\Queries\GetFileSummaryHandler;
use Vendor\Ai\Application\Queries\GetFileSummaryQuery;
use Vendor\Ai\Application\SummaryNotAvailable;
use Vendor\Ai\Domain\Contracts\SummaryPublishFailed;
use Vendor\Ai\Domain\Contracts\SummaryTargetDenied;
use Vendor\Ai\Domain\Contracts\SummaryTargetUnsupported;
use Vendor\Ai\Infrastructure\Quota\QuotaExceeded;
use Vendor\Ai\Presentation\Http\Api\V1\Requests\RequestFileSummaryRequest;
use Vendor\Ai\Presentation\Http\Api\V1\Resources\FileSummaryResource;

/**
 * Пересказ документа: запуск, состояние и публикация. Контроллер только
 * переводит транспорт в команду и ошибку домена — в код ответа.
 */
final class FileSummaryController
{
    /** Запуск: 202, потому что документ обрабатывается в очереди (design 4). */
    public function store(RequestFileSummaryRequest $request, SummarizeFileHandler $handler): JsonResponse
    {
        $validated = $request->validated();

        try {
            $result = $handler->handle(new SummarizeFileCommand(
                userId: (string) $request->user()->getAuthIdentifier(),
                messageId: $validated['message_id'],
                body: $validated['body'],
                idempotencyKey: $validated['idempotency_key'] ?? null,
                locale: $validated['locale'] ?? null,
            ));
        } catch (AiUnavailable $exception) {
            // 503: чат при этом работает как обычно.
            throw new HttpException(503, $exception->getMessage());
        } catch (QuotaExceeded $exception) {
            throw new TooManyRequestsHttpException($exception->retryAfterSeconds, 'AI quota exceeded.');
        } catch (SummaryTargetDenied $exception) {
            // Чужой личной переписки для постороннего не существует.
            throw $exception->hidden
                ? new NotFoundHttpException('Message not found.')
                : new AccessDeniedHttpException('Message is not available.');
        } catch (SummaryTargetUnsupported|InvalidArgumentException $exception) {
            throw ValidationException::withMessages(['message_id' => [$exception->getMessage()]]);
        }

        // Повтор с тем же ключом — та же операция, второго задания нет.
        return FileSummaryResource::make($result['summary'])
            ->response()
            ->setStatusCode($result['replayed'] ? 200 : 202);
    }

    /** Ресинхронизация после переподключения (spec: HTTP resync). */
    public function show(Request $request, string $fileSummary, GetFileSummaryHandler $handler): FileSummaryResource
    {
        return FileSummaryResource::make($handler->handle(new GetFileSummaryQuery(
            userId: (string) $request->user()->getAuthIdentifier(),
            summaryId: $fileSummary,
        )));
    }

    /** Публикация подтверждённого черновика от имени запросившего. */
    public function publish(Request $request, string $fileSummary, PublishFileSummaryHandler $handler): JsonResponse
    {
        try {
            $summary = $handler->handle(new PublishFileSummaryCommand(
                userId: (string) $request->user()->getAuthIdentifier(),
                summaryId: $fileSummary,
            ));
        } catch (SummaryNotAvailable|SummaryPublishFailed $exception) {
            throw new ConflictHttpException($exception->getMessage());
        }

        return FileSummaryResource::make($summary)->response()->setStatusCode(201);
    }
}
