<?php

declare(strict_types=1);

use Vendor\Ai\Application\AiUnavailable;
use Vendor\Ai\Application\Commands\ReviseDraftCommand;
use Vendor\Ai\Application\Handlers\Commands\ReviseDraftHandler;
use Vendor\Ai\Domain\Contracts\ProviderUnavailable;
use Vendor\Ai\Domain\Contracts\TextRevisionProvider;
use Vendor\Ai\Domain\Models\AiRequest;
use Vendor\Ai\Infrastructure\Quota\QuotaExceeded;
use Vendor\Ai\Testing\FakeTextRevisionProvider;
use Vendor\Identity\Domain\Models\User;

function useProvider(TextRevisionProvider $provider): TextRevisionProvider
{
    app()->instance(TextRevisionProvider::class, $provider);

    return $provider;
}

it('suggests a revision without publishing anything', function (): void {
    $provider = useProvider(new FakeTextRevisionProvider(suggestion: 'Так понятнее'));
    $user = User::factory()->create();

    $result = app(ReviseDraftHandler::class)->handle(new ReviseDraftCommand(
        userId: (string) $user->getKey(),
        operation: 'clarify',
        text: '  привет как дела  ',
    ));

    expect($result->suggestion)->toBe('Так понятнее')
        ->and($result->original)->toBe('привет как дела')
        ->and($result->provider)->toBe('fake');

    // Провайдер получил только черновик — без истории комнаты.
    expect($provider->calls)->toHaveCount(1)
        ->and($provider->calls[0]['draft'])->toBe('привет как дела')
        ->and($provider->calls[0]['operation'])->toBe('clarify');
});

it('records safe audit data on success', function (): void {
    useProvider(new FakeTextRevisionProvider);
    $user = User::factory()->create();

    app(ReviseDraftHandler::class)->handle(new ReviseDraftCommand(
        userId: (string) $user->getKey(),
        operation: 'fix',
        text: 'текст с ашипкой',
    ));

    $record = AiRequest::query()->firstOrFail();

    expect($record->status->value)->toBe('succeeded')
        ->and($record->provider)->toBe('fake')
        ->and($record->model)->toBe('fake/model')
        ->and($record->prompt_tokens)->toBe(12)
        ->and($record->input_length)->toBe(15);

    // Ни промпта, ни ответа, ни ключей в аудите нет.
    $stored = json_encode($record->toArray(), JSON_UNESCAPED_UNICODE);
    expect($stored)->not->toContain('текст с ашипкой')->not->toContain('Улучшенный текст');
});

it('records a timeout and rethrows it', function (): void {
    useProvider(FakeTextRevisionProvider::failing(timedOut: true));
    $user = User::factory()->create();

    expect(fn () => app(ReviseDraftHandler::class)->handle(new ReviseDraftCommand(
        userId: (string) $user->getKey(),
        operation: 'fix',
        text: 'черновик',
    )))->toThrow(ProviderUnavailable::class);

    expect(AiRequest::query()->firstOrFail()->status->value)->toBe('timed_out');
});

it('records a provider failure and rethrows it', function (): void {
    useProvider(FakeTextRevisionProvider::failing());
    $user = User::factory()->create();

    expect(fn () => app(ReviseDraftHandler::class)->handle(new ReviseDraftCommand(
        userId: (string) $user->getKey(),
        operation: 'fix',
        text: 'черновик',
    )))->toThrow(ProviderUnavailable::class);

    expect(AiRequest::query()->firstOrFail()->status->value)->toBe('failed');
});

it('refuses text longer than the limit before calling the provider', function (): void {
    $provider = useProvider(new FakeTextRevisionProvider);
    config()->set('ai.limits.max_input_length', 20);
    $user = User::factory()->create();

    expect(fn () => app(ReviseDraftHandler::class)->handle(new ReviseDraftCommand(
        userId: (string) $user->getKey(),
        operation: 'fix',
        text: str_repeat('а', 21),
    )))->toThrow(InvalidArgumentException::class);

    expect($provider->calls)->toBeEmpty();
});

it('enforces the per-user quota', function (): void {
    $provider = useProvider(new FakeTextRevisionProvider);
    config()->set('ai.limits.per_user_minute', 2);
    $user = User::factory()->create();

    $command = new ReviseDraftCommand(
        userId: (string) $user->getKey(),
        operation: 'fix',
        text: 'черновик',
    );

    app(ReviseDraftHandler::class)->handle($command);
    app(ReviseDraftHandler::class)->handle($command);

    expect(fn () => app(ReviseDraftHandler::class)->handle($command))->toThrow(QuotaExceeded::class);
    expect($provider->calls)->toHaveCount(2);
});

it('refuses to work when the administrator disabled AI', function (): void {
    $provider = useProvider(new FakeTextRevisionProvider);
    config()->set('ai.enabled', false);
    $user = User::factory()->create();

    expect(fn () => app(ReviseDraftHandler::class)->handle(new ReviseDraftCommand(
        userId: (string) $user->getKey(),
        operation: 'fix',
        text: 'черновик',
    )))->toThrow(AiUnavailable::class);

    expect($provider->calls)->toBeEmpty()
        ->and(AiRequest::query()->count())->toBe(0);
});

it('opens the circuit after repeated failures', function (): void {
    $provider = useProvider(FakeTextRevisionProvider::failing());
    config()->set('ai.circuit_breaker.failures_before_open', 2);
    config()->set('ai.limits.per_user_minute', 50);
    $user = User::factory()->create();

    $command = new ReviseDraftCommand(
        userId: (string) $user->getKey(),
        operation: 'fix',
        text: 'черновик',
    );

    foreach (range(1, 2) as $attempt) {
        try {
            app(ReviseDraftHandler::class)->handle($command);
        } catch (ProviderUnavailable) {
            // ожидаемо
        }
    }

    $callsBefore = count($provider->calls);

    try {
        app(ReviseDraftHandler::class)->handle($command);
    } catch (ProviderUnavailable) {
        // ожидаемо
    }

    // Цепь разомкнута: поставщика больше не дёргаем.
    expect($provider->calls)->toHaveCount($callsBefore);
});
