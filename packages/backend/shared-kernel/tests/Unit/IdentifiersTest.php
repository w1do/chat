<?php

declare(strict_types=1);

use Vendor\SharedKernel\Identifiers\ActorId;
use Vendor\SharedKernel\Identifiers\Ulid;

it('generates valid ulids', function (): void {
    $ulid = Ulid::generate();

    expect(Ulid::fromString($ulid->value)->equals($ulid))->toBeTrue();
});

it('rejects malformed ulids', function (): void {
    Ulid::fromString('not-a-ulid');
})->throws(InvalidArgumentException::class);

it('keeps typed identifiers distinct', function (): void {
    expect(ActorId::generate())->toBeInstanceOf(ActorId::class);
});
