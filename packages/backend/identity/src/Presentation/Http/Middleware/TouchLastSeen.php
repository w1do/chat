<?php

declare(strict_types=1);

namespace Vendor\Identity\Presentation\Http\Middleware;

use Closure;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Vendor\Identity\Application\Support\PresenceTouch;

/**
 * Любое действие вошедшего человека — признак того, что он в сети.
 *
 * Отметка ставится до ответа, чтобы ответ уже содержал верный статус самого
 * себя, и повторяется после ответа: у запроса с токеном пользователь
 * появляется только после auth-middleware. Второй раз в базу не пишется —
 * окно троттлинга уже занято.
 */
final readonly class TouchLastSeen
{
    public function __construct(private PresenceTouch $presence) {}

    public function handle(Request $request, Closure $next): Response
    {
        $this->touch($request);

        return $next($request);
    }

    public function terminate(Request $request, Response $response): void
    {
        $this->touch($request);
    }

    private function touch(Request $request): void
    {
        $user = $request->user();

        if ($user instanceof Model) {
            $this->presence->touch($user);
        }
    }
}
