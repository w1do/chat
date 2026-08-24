<?php

declare(strict_types=1);

it('registers the chat package config', function (): void {
    expect(config('chat.routes.enabled'))->toBeTrue();
});
