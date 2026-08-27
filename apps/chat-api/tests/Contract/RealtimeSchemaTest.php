<?php

declare(strict_types=1);

use Opis\JsonSchema\Validator;
use Vendor\Ai\Domain\Enums\FileSummaryStatus;
use Vendor\Ai\Infrastructure\Broadcasting\FileSummaryUpdatedV1;
use Vendor\Chat\Infrastructure\Broadcasting\MessageCreatedV1;
use Vendor\Chat\Infrastructure\Broadcasting\MessageDeletedV1;
use Vendor\Chat\Infrastructure\Broadcasting\MessageUpdatedV1;
use Vendor\Chat\Infrastructure\Broadcasting\ReactionChangedV1;
use Vendor\Chat\Infrastructure\Broadcasting\RoomDeletedV1;
use Vendor\Chat\Infrastructure\Broadcasting\RoomMemberChangedV1;
use Vendor\Chat\Infrastructure\Broadcasting\TypingChangedV1;

const REALTIME_EVENTS = [
    'message.created.v1',
    'message.updated.v1',
    'message.deleted.v1',
    'reaction.changed.v1',
    'room.member_changed.v1',
    'room.deleted.v1',
    'typing.changed.v1',
    'ai.file_summary.updated.v1',
];

function realtimeValidator(): Validator
{
    $validator = new Validator;
    $validator->resolver()?->registerPrefix(
        'https://contracts.chat.local/realtime/',
        dirname(__DIR__, 4).'/packages/contracts/realtime',
    );

    return $validator;
}

it('has a schema and a valid fixture for every versioned event', function (string $event): void {
    $schemaFile = dirname(__DIR__, 4)."/packages/contracts/realtime/{$event}.schema.json";
    $fixtureFile = dirname(__DIR__)."/fixtures/realtime/{$event}.json";

    expect($schemaFile)->toBeFile()->and($fixtureFile)->toBeFile();

    $payload = json_decode((string) file_get_contents($fixtureFile));
    $result = realtimeValidator()->validate($payload, "https://contracts.chat.local/realtime/{$event}.schema.json");

    expect($result->isValid())->toBeTrue(
        $result->hasError() ? json_encode($result->error()->message()) : '',
    );
})->with(REALTIME_EVENTS);

it('validates the system-message fixture against the message.created schema', function (): void {
    $payload = json_decode((string) file_get_contents(dirname(__DIR__).'/fixtures/realtime/message.created.v1.system.json'));

    $result = realtimeValidator()->validate($payload, 'https://contracts.chat.local/realtime/message.created.v1.schema.json');

    expect($result->isValid())->toBeTrue(
        $result->hasError() ? json_encode($result->error()->message()) : '',
    )->and($payload->data->kind)->toBe('system')
        ->and($payload->data->payload->event)->toBe('member.joined');
});

it('keeps the summary draft itself out of the real-time payload', function (): void {
    $payload = (new FileSummaryUpdatedV1(
        userId: '01j8zc2v9q4t5w6x7y8z9abcdf',
        roomId: '01j8zc2v9q4t5w6x7y8z9abcde',
        summaryId: '01j8zc2v9q4t5w6x7y8z9abcdh',
        status: FileSummaryStatus::Succeeded,
        errorCode: null,
        occurredAt: '2026-08-27T12:00:00Z',
    ))->broadcastWith();

    expect(array_keys($payload['data']))->toBe(['id', 'status', 'progress', 'error_code'])
        ->and($payload['data']['progress'])->toBe(100);
});

it('rejects payloads with undeclared fields', function (): void {
    $payload = json_decode((string) file_get_contents(dirname(__DIR__).'/fixtures/realtime/typing.changed.v1.json'));
    $payload->data->leaked_private_field = 'room history';

    $result = realtimeValidator()->validate($payload, 'https://contracts.chat.local/realtime/typing.changed.v1.schema.json');

    expect($result->isValid())->toBeFalse();
});

it('rejects payloads of the wrong event name or version', function (): void {
    $payload = json_decode((string) file_get_contents(dirname(__DIR__).'/fixtures/realtime/typing.changed.v1.json'));
    $payload->version = 2;

    $result = realtimeValidator()->validate($payload, 'https://contracts.chat.local/realtime/typing.changed.v1.schema.json');

    expect($result->isValid())->toBeFalse();
});

it('produces broadcast payloads that validate against the contract schemas', function (): void {
    $roomId = '01j8zc2v9q4t5w6x7y8z9abcde';
    $userId = '01j8zc2v9q4t5w6x7y8z9abcdf';
    $messageId = '01j8zc2v9q4t5w6x7y8z9abcdg';
    $now = '2026-08-24T12:00:00Z';

    $events = [
        new MessageCreatedV1($roomId, [
            'id' => $messageId,
            'kind' => 'text',
            'author' => ['id' => $userId, 'name' => 'Alice'],
            'body' => 'Hello',
            'payload' => null,
            'attachments' => [],
            'reply_to_id' => null,
            'created_at' => $now,
        ], $now),
        // Системная запись: событие вместо прозы (design 1c).
        new MessageCreatedV1($roomId, [
            'id' => $messageId,
            'kind' => 'system',
            'author' => ['id' => $userId, 'name' => 'Alice'],
            'body' => '',
            'payload' => ['event' => 'member.joined', 'actor_id' => $userId],
            'attachments' => [],
            'reply_to_id' => null,
            'created_at' => $now,
        ], $now),
        new MessageUpdatedV1($roomId, [
            'id' => $messageId,
            'body' => 'Edited',
            'edited_at' => $now,
        ], $now),
        new MessageDeletedV1($roomId, [
            'id' => $messageId,
            'deleted_at' => $now,
        ], $now),
        new ReactionChangedV1($roomId, [
            'message_id' => $messageId,
            'user_id' => $userId,
            'emoji' => '👍',
            'action' => 'added',
            'count' => 1,
        ], $now),
        new RoomMemberChangedV1($roomId, [
            'user_id' => $userId,
            'action' => 'joined',
            'role' => 'member',
        ], $now),
        new RoomDeletedV1($roomId, [
            'name' => 'Семья',
        ], $now),
        new TypingChangedV1($roomId, [
            'user_id' => $userId,
            'is_typing' => true,
        ], $now),
        // Пересказ документа уходит на приватный канал автора запроса; в
        // payload только ход и код отказа — черновик читается по HTTP.
        new FileSummaryUpdatedV1(
            userId: $userId,
            roomId: $roomId,
            summaryId: '01j8zc2v9q4t5w6x7y8z9abcdh',
            status: FileSummaryStatus::Succeeded,
            errorCode: null,
            occurredAt: $now,
        ),
        new FileSummaryUpdatedV1(
            userId: $userId,
            roomId: $roomId,
            summaryId: '01j8zc2v9q4t5w6x7y8z9abcdh',
            status: FileSummaryStatus::Failed,
            errorCode: 'provider_timeout',
            occurredAt: $now,
        ),
    ];

    foreach ($events as $event) {
        $payload = json_decode(json_encode($event->broadcastWith()));
        $schema = 'https://contracts.chat.local/realtime/'.$event->broadcastAs().'.schema.json';

        $result = realtimeValidator()->validate($payload, $schema);

        expect($result->isValid())->toBeTrue(
            $event->broadcastAs().': '.($result->hasError() ? json_encode($result->error()->message()) : ''),
        );
    }
});
