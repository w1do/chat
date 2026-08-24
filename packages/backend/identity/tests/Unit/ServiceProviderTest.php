<?php

declare(strict_types=1);

it('registers the identity package config', function (): void {
    expect(config('identity.routes.enabled'))->toBeTrue();
});
