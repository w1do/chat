<?php

declare(strict_types=1);

namespace Vendor\Chat\Presentation\Http\Api\V1\Controllers;

use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpKernel\Exception\ServiceUnavailableHttpException;
use Vendor\Chat\Application\Handlers\Queries\SearchMessagesHandler;
use Vendor\Chat\Application\Queries\SearchMessagesQuery;
use Vendor\Chat\Domain\Contracts\SearchUnavailable;
use Vendor\Chat\Presentation\Http\Api\V1\Requests\SearchMessagesRequest;
use Vendor\Chat\Presentation\Http\Api\V1\Resources\MessageResource;

final class SearchController
{
    public function index(SearchMessagesRequest $request, SearchMessagesHandler $handler): JsonResponse
    {
        $input = $request->validated();

        try {
            $results = $handler->handle(new SearchMessagesQuery(
                term: (string) $input['q'],
                roomId: $input['room_id'] ?? null,
                limit: (int) ($input['limit'] ?? config('chat.search.page_size', 20)),
            ), (string) $request->user()->getAuthIdentifier());
        } catch (SearchUnavailable) {
            // Документированная деградация: чат работает, поиск временно нет.
            throw new ServiceUnavailableHttpException(message: 'Search is temporarily unavailable.');
        }

        return MessageResource::collection($results)->response();
    }
}
