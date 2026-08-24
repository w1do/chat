<?php

declare(strict_types=1);

namespace Vendor\Ai\Presentation\Http\Api\V1\Controllers;

use Symfony\Component\HttpKernel\Exception\HttpException;
use Symfony\Component\HttpKernel\Exception\TooManyRequestsHttpException;
use Vendor\Ai\Application\AiUnavailable;
use Vendor\Ai\Application\Commands\ReviseDraftCommand;
use Vendor\Ai\Application\Handlers\Commands\ReviseDraftHandler;
use Vendor\Ai\Domain\Contracts\ProviderUnavailable;
use Vendor\Ai\Infrastructure\Quota\QuotaExceeded;
use Vendor\Ai\Presentation\Http\Api\V1\Requests\ReviseMessageRequest;
use Vendor\Ai\Presentation\Http\Api\V1\Resources\RevisionResource;

final class MessageRevisionController
{
    public function store(ReviseMessageRequest $request, ReviseDraftHandler $handler): RevisionResource
    {
        $validated = $request->validated();

        try {
            $revision = $handler->handle(new ReviseDraftCommand(
                userId: (string) $request->user()->getAuthIdentifier(),
                operation: $validated['operation'],
                text: $validated['text'],
                tone: $validated['tone'] ?? null,
                instruction: $validated['instruction'] ?? null,
            ));
        } catch (AiUnavailable $exception) {
            // 503: чат при этом работает как обычно.
            throw new HttpException(503, $exception->getMessage());
        } catch (QuotaExceeded $exception) {
            throw new TooManyRequestsHttpException($exception->retryAfterSeconds, 'AI quota exceeded.');
        } catch (ProviderUnavailable $exception) {
            throw new HttpException(
                503,
                $exception->timedOut ? 'AI provider timed out.' : 'AI provider is unavailable.',
            );
        }

        return RevisionResource::make($revision);
    }
}
