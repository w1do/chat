<?php

declare(strict_types=1);

use App\Support\TraceId;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Validator;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;

beforeEach(function (): void {
    Route::middleware('api')->prefix('api/v1/_test')->group(function (): void {
        Route::post('/validate', function () {
            Validator::make(request()->all(), ['name' => ['required', 'string']])->validate();

            return ['ok' => true];
        });
        Route::get('/unauthenticated', fn () => throw new AuthenticationException);
        Route::get('/forbidden', fn () => throw new AuthorizationException);
        Route::get('/conflict', fn () => throw new ConflictHttpException('Message was edited concurrently.'));
        Route::get('/boom', fn () => throw new RuntimeException('secret internal detail'));
        Route::get('/limited', fn () => ['ok' => true])->middleware('throttle:2,1');
    });
});

function assertEnvelope($response, int $status, string $code): void
{
    $response->assertStatus($status)
        ->assertHeader('Content-Type', 'application/json')
        ->assertHeader(TraceId::HEADER)
        ->assertJsonStructure(['code', 'message', 'details', 'trace_id'])
        ->assertJsonPath('code', $code);
}

it('renders validation errors in the envelope', function (): void {
    $response = $this->postJson('/api/v1/_test/validate', []);

    assertEnvelope($response, 422, 'validation_failed');
    $response->assertJsonPath('details.errors.name.0', fn (string $m) => $m !== '');
});

it('renders unauthenticated errors in the envelope', function (): void {
    assertEnvelope($this->getJson('/api/v1/_test/unauthenticated'), 401, 'unauthenticated');
});

it('renders forbidden errors in the envelope', function (): void {
    assertEnvelope($this->getJson('/api/v1/_test/forbidden'), 403, 'forbidden');
});

it('renders not found errors in the envelope', function (): void {
    assertEnvelope($this->getJson('/api/v1/_test/definitely-missing'), 404, 'not_found');
});

it('renders domain conflicts in the envelope', function (): void {
    $response = $this->getJson('/api/v1/_test/conflict');

    assertEnvelope($response, 409, 'conflict');
    $response->assertJsonPath('message', 'Message was edited concurrently.');
});

it('renders rate limiting in the envelope with Retry-After', function (): void {
    RateLimiter::clear('_test');

    $this->getJson('/api/v1/_test/limited')->assertOk();
    $this->getJson('/api/v1/_test/limited')->assertOk();
    $response = $this->getJson('/api/v1/_test/limited');

    assertEnvelope($response, 429, 'rate_limited');
    $response->assertHeader('Retry-After');
});

it('renders unexpected errors without leaking internals', function (): void {
    $response = $this->withoutExceptionHandling()->getJson('/api/v1/_test/boom');
})->throws(RuntimeException::class);

it('hides internal messages of unexpected errors in the envelope', function (): void {
    config()->set('app.debug', false);

    $response = $this->getJson('/api/v1/_test/boom');

    assertEnvelope($response, 500, 'server_error');
    expect($response->getContent())->not->toContain('secret internal detail');
});

it('echoes a valid incoming trace id and generates one otherwise', function (): void {
    $incoming = 'client-trace-0001';

    $this->getJson('/api/v1/_test/forbidden', [TraceId::HEADER => $incoming])
        ->assertHeader(TraceId::HEADER, $incoming)
        ->assertJsonPath('trace_id', $incoming);

    $generated = $this->getJson('/api/v1/_test/forbidden')->json('trace_id');
    expect($generated)->toBeString()->not->toBe($incoming);
});
