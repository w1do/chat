<?php

declare(strict_types=1);

namespace Vendor\Ai\Domain\ValueObjects;

/** Предложение провайдера: пользователь принимает его сам (spec: never auto-publish). */
final readonly class RevisionResult
{
    public function __construct(
        public string $suggestion,
        public string $model,
        public TokenUsage $usage = new TokenUsage,
    ) {}
}
