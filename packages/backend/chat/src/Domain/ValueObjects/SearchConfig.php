<?php

declare(strict_types=1);

namespace Vendor\Chat\Domain\ValueObjects;

use InvalidArgumentException;

/**
 * Разобранная и проверенная конфигурация поиска. Пустое значение обязательного
 * параметра — ошибка запуска, а не молчаливо неработающий индекс.
 */
final readonly class SearchConfig
{
    private const DRIVERS = ['typesense', 'null'];

    public function __construct(
        public bool $enabled,
        public string $driver,
        public string $collection,
        public string $host,
        public int $port,
        public string $protocol,
        public string $apiKey,
        public int $timeoutSeconds,
        public int $pageSize,
        public string $queue,
    ) {}

    /** @param array<string, mixed> $config */
    public static function fromArray(array $config): self
    {
        $enabled = (bool) ($config['enabled'] ?? false);
        $driver = (string) ($config['driver'] ?? 'null');

        if (! in_array($driver, self::DRIVERS, true)) {
            throw new InvalidArgumentException("Unknown search driver [{$driver}].");
        }

        if (! $enabled || $driver === 'null') {
            return new self(
                enabled: false,
                driver: 'null',
                collection: (string) ($config['collection'] ?? 'messages'),
                host: '',
                port: 0,
                protocol: 'http',
                apiKey: '',
                timeoutSeconds: 3,
                pageSize: (int) ($config['page_size'] ?? 20),
                queue: (string) ($config['queue'] ?? 'search'),
            );
        }

        foreach (['collection', 'host', 'api_key'] as $key) {
            if (trim((string) ($config[$key] ?? '')) === '') {
                // Имя ключа, не значение: секрет наружу не выносим.
                throw new InvalidArgumentException("Search configuration is missing [{$key}].");
            }
        }

        $port = (int) ($config['port'] ?? 0);

        if ($port <= 0) {
            throw new InvalidArgumentException('Search configuration is missing [port].');
        }

        return new self(
            enabled: true,
            driver: $driver,
            collection: (string) $config['collection'],
            host: (string) $config['host'],
            port: $port,
            protocol: (string) ($config['protocol'] ?? 'http'),
            apiKey: (string) $config['api_key'],
            timeoutSeconds: max(1, (int) ($config['timeout_seconds'] ?? 3)),
            pageSize: max(1, min((int) ($config['page_size'] ?? 20), 100)),
            queue: (string) ($config['queue'] ?? 'search'),
        );
    }

    public function baseUrl(): string
    {
        return "{$this->protocol}://{$this->host}:{$this->port}";
    }
}
