<?php

declare(strict_types=1);

namespace App\Support\Readiness;

/** Статус компонента readiness. Detail не должен содержать секреты и хосты. */
final readonly class ComponentStatus
{
    private function __construct(
        public string $status,
        public ?string $detail = null,
    ) {}

    public static function ok(): self
    {
        return new self('ok');
    }

    public static function fail(string $detail): self
    {
        return new self('fail', $detail);
    }

    public function isOk(): bool
    {
        return $this->status === 'ok';
    }

    /** @return array{status: string, detail?: string} */
    public function toArray(): array
    {
        return $this->detail === null
            ? ['status' => $this->status]
            : ['status' => $this->status, 'detail' => $this->detail];
    }
}
