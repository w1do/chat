<?php

declare(strict_types=1);

namespace Vendor\Chat\Infrastructure\Search;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Factory as HttpFactory;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Client\Response;
use Throwable;
use Vendor\Chat\Domain\Contracts\MessageIndex;
use Vendor\Chat\Domain\Contracts\SearchUnavailable;
use Vendor\Chat\Domain\ValueObjects\IndexedMessage;
use Vendor\Chat\Domain\ValueObjects\SearchConfig;

/**
 * Typesense через его HTTP API: отдельный SDK ради пяти запросов не нужен
 * (CLAUDE.md §20). Ключ живёт в конфигурации и не попадает в исключения.
 */
final readonly class TypesenseMessageIndex implements MessageIndex
{
    /** Схема коллекции: только безопасные поля (см. IndexedMessage). */
    private const FIELDS = [
        ['name' => 'room_id', 'type' => 'string', 'facet' => true],
        ['name' => 'author_id', 'type' => 'string', 'facet' => true],
        ['name' => 'body', 'type' => 'string'],
        ['name' => 'created_at', 'type' => 'int64', 'sort' => true],
    ];

    public function __construct(
        private HttpFactory $http,
        private SearchConfig $config,
    ) {}

    public function ensureCollection(): void
    {
        $existing = $this->send(fn (PendingRequest $r): Response => $r->get($this->url('/collections/'.$this->config->collection)));

        if ($existing->successful()) {
            return;
        }

        $this->expectSuccess($this->send(fn (PendingRequest $r): Response => $r->post($this->url('/collections'), [
            'name' => $this->config->collection,
            'fields' => self::FIELDS,
            'default_sorting_field' => 'created_at',
        ])));
    }

    public function recreateCollection(): void
    {
        $this->send(fn (PendingRequest $r): Response => $r->delete($this->url('/collections/'.$this->config->collection)));

        $this->ensureCollection();
    }

    public function index(IndexedMessage $message): void
    {
        // upsert: повтор задания даёт тот же документ, а не дубль.
        $this->expectSuccess($this->send(fn (PendingRequest $r): Response => $r->post(
            $this->url('/collections/'.$this->config->collection.'/documents?action=upsert'),
            $message->toDocument(),
        )));
    }

    public function indexMany(array $messages): void
    {
        if ($messages === []) {
            return;
        }

        $lines = implode("\n", array_map(
            static fn (IndexedMessage $message): string => (string) json_encode($message->toDocument()),
            $messages,
        ));

        $this->expectSuccess($this->send(fn (PendingRequest $r): Response => $r
            ->withBody($lines, 'text/plain')
            ->post($this->url('/collections/'.$this->config->collection.'/documents/import?action=upsert'))));
    }

    public function remove(string $messageId): void
    {
        $response = $this->send(fn (PendingRequest $r): Response => $r->delete(
            $this->url('/collections/'.$this->config->collection.'/documents/'.$messageId),
        ));

        // Удаление отсутствующего документа — уже достигнутая цель.
        if ($response->status() === 404) {
            return;
        }

        $this->expectSuccess($response);
    }

    public function search(string $term, array $roomIds, int $limit): array
    {
        if ($roomIds === []) {
            return [];
        }

        $filter = 'room_id:['.implode(',', $roomIds).']';

        $response = $this->send(fn (PendingRequest $r): Response => $r->get(
            $this->url('/collections/'.$this->config->collection.'/documents/search'),
            [
                'q' => $term,
                'query_by' => 'body',
                'filter_by' => $filter,
                'per_page' => $limit,
                'include_fields' => 'id',
            ],
        ));

        $this->expectSuccess($response);

        /** @var list<array{document?: array{id?: string}}> $hits */
        $hits = $response->json('hits', []);

        return array_values(array_filter(array_map(
            static fn (array $hit): ?string => $hit['document']['id'] ?? null,
            $hits,
        )));
    }

    /** @param callable(PendingRequest): Response $call */
    private function send(callable $call): Response
    {
        $request = $this->http
            ->withHeaders(['X-TYPESENSE-API-KEY' => $this->config->apiKey])
            ->timeout($this->config->timeoutSeconds)
            ->connectTimeout($this->config->timeoutSeconds)
            ->acceptJson();

        try {
            return $call($request);
        } catch (ConnectionException) {
            throw SearchUnavailable::unreachable();
        } catch (Throwable) {
            throw SearchUnavailable::unreachable();
        }
    }

    private function expectSuccess(Response $response): void
    {
        if (! $response->successful()) {
            // Тело ответа может содержать эхо запроса — наружу его не выносим.
            throw SearchUnavailable::unreachable();
        }
    }

    private function url(string $path): string
    {
        return $this->config->baseUrl().$path;
    }
}
