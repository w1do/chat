<?php

declare(strict_types=1);

use Vendor\Administration\Application\Commands\UpdateSettingsCommand;
use Vendor\Administration\Application\Handlers\Commands\UpdateSettingsHandler;
use Vendor\Administration\Application\Handlers\Queries\ListAuditHandler;
use Vendor\Administration\Application\Queries\ListAuditQuery;
use Vendor\Administration\Domain\Contracts\AuditRecorder;
use Vendor\Administration\Domain\Enums\Setting;
use Vendor\Administration\Domain\Models\AuditLog;
use Vendor\Administration\Infrastructure\Persistence\SettingsStore;
use Vendor\Administration\Infrastructure\Redaction\ContextRedactor;

it('keeps secrets and private text out of the audit context', function (): void {
    app(AuditRecorder::class)->record(
        action: 'ai.revision.completed',
        actorId: 'u1',
        actorLabel: 'Алиса',
        context: [
            'operation' => 'improve',
            'api_key' => 'sk-live-secret',
            'prompt' => 'весь черновик пользователя',
            'suggestion' => 'исправленный текст',
            'email' => 'alice@example.com',
            'tokens' => 42,
            'nested' => ['password' => 'hunter2', 'model' => 'gpt-4o-mini'],
        ],
    );

    $context = AuditLog::query()->sole()->context;

    expect($context['operation'])->toBe('improve')
        ->and($context['tokens'])->toBe(42)
        ->and($context['nested']['model'])->toBe('gpt-4o-mini')
        ->and($context['api_key'])->toBe('[redacted]')
        ->and($context['prompt'])->toBe('[redacted]')
        ->and($context['suggestion'])->toBe('[redacted]')
        ->and($context['email'])->toBe('[redacted]')
        ->and($context['nested']['password'])->toBe('[redacted]');
});

it('truncates long values instead of storing a second copy of the text', function (): void {
    $redacted = (new ContextRedactor(maxStringLength: 10))->redact(['note' => str_repeat('а', 50)]);

    expect(mb_strlen((string) $redacted['note']))->toBe(11);
});

it('records the AI switch and reports the new value', function (): void {
    $handler = app(UpdateSettingsHandler::class);

    expect($handler->handle(new UpdateSettingsCommand(aiEnabled: true, actorId: 'u1', actorLabel: 'Алиса'))->aiEnabled)
        ->toBeTrue()
        ->and(app(SettingsStore::class)->get(Setting::AiEnabled))->toBeTrue();

    $entry = AuditLog::query()->sole();

    expect($entry->action)->toBe('administration.settings.updated')
        ->and($entry->actor_id)->toBe('u1')
        ->and($entry->context['value'])->toBeTrue();
});

it('pages audit records newest first', function (): void {
    $recorder = app(AuditRecorder::class);

    foreach (range(1, 5) as $i) {
        $recorder->record(action: "test.action.{$i}", actorId: 'u1');
    }

    $first = app(ListAuditHandler::class)->handle(new ListAuditQuery(limit: 2));

    expect($first['items'])->toHaveCount(2)
        ->and($first['items'][0]->action)->toBe('test.action.5')
        ->and($first['nextCursor'])->not->toBeNull();

    $second = app(ListAuditHandler::class)->handle(new ListAuditQuery(cursor: $first['nextCursor'], limit: 2));

    expect($second['items'][0]->action)->toBe('test.action.3');

    // Фильтр по действию не смешивает чужие записи.
    $filtered = app(ListAuditHandler::class)->handle(new ListAuditQuery(action: 'test.action.1'));
    expect($filtered['items'])->toHaveCount(1);
});
