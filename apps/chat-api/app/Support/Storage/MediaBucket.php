<?php

declare(strict_types=1);

namespace App\Support\Storage;

use Aws\S3\Exception\S3Exception;
use Aws\S3\S3ClientInterface;

/**
 * Бакет объектного хранилища как часть установки: создаётся при запуске,
 * повторный запуск — не ошибка (ADR-011). Ручных действий в консоли
 * хранилища установка не требует.
 */
final readonly class MediaBucket
{
    public function __construct(
        private S3ClientInterface $client,
        private string $bucket,
    ) {}

    /** @return 'created'|'exists' */
    public function ensure(): string
    {
        if ($this->exists()) {
            return 'exists';
        }

        try {
            $this->client->createBucket(['Bucket' => $this->bucket]);
        } catch (S3Exception $exception) {
            // Гонка двух контейнеров при первом запуске: «уже есть» — успех.
            if (! in_array($exception->getAwsErrorCode(), ['BucketAlreadyOwnedByYou', 'BucketAlreadyExists'], true)) {
                throw $exception;
            }

            return 'exists';
        }

        return 'created';
    }

    private function exists(): bool
    {
        try {
            $this->client->headBucket(['Bucket' => $this->bucket]);

            return true;
        } catch (S3Exception $exception) {
            if ((int) $exception->getStatusCode() === 404) {
                return false;
            }

            throw $exception;
        }
    }
}
