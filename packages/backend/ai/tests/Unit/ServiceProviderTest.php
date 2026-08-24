<?php

declare(strict_types=1);

it('registers the ai package config', function (): void {
    expect(config('ai.routes.enabled'))->toBeTrue();
});
