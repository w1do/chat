<?php

declare(strict_types=1);

it('registers the administration package config', function (): void {
    expect(config('administration.routes.enabled'))->toBeTrue();
});
