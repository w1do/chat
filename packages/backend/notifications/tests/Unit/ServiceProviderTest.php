<?php

declare(strict_types=1);

it('registers the notifications package config', function (): void {
    expect(config('notifications.routes.enabled'))->toBeTrue();
});
