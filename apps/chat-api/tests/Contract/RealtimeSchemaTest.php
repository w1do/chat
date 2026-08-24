<?php

declare(strict_types=1);

use Opis\JsonSchema\Validator;

const REALTIME_EVENTS = [
    'message.created.v1',
    'message.updated.v1',
    'message.deleted.v1',
    'reaction.changed.v1',
    'room.member_changed.v1',
    'typing.changed.v1',
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
