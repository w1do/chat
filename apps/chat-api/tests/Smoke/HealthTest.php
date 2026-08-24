<?php

declare(strict_types=1);

it('reports liveness on /up', function (): void {
    $this->get('/up')->assertOk();
});
