<?php

declare(strict_types=1);

namespace App\Support;

use Illuminate\Http\Request;
use Symfony\Component\Uid\Ulid;

/** Идентификатор трассировки для error envelope и логов. */
final class TraceId
{
    public const HEADER = 'X-Trace-Id';

    public static function fromRequest(Request $request): string
    {
        $incoming = $request->header(self::HEADER);

        if (is_string($incoming) && preg_match('/^[0-9a-zA-Z\-]{8,64}$/', $incoming)) {
            return $incoming;
        }

        return (string) new Ulid;
    }
}
