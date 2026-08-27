<?php

declare(strict_types=1);

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;
use Spatie\MediaLibrary\Conversions\Jobs\PerformConversionsJob;
use Spatie\MediaLibrary\MediaCollections\Models\Media;
use Vendor\Chat\Application\Commands\DeleteRoomCommand;
use Vendor\Chat\Application\Commands\SendMessageCommand;
use Vendor\Chat\Application\Commands\UploadAttachmentCommand;
use Vendor\Chat\Application\DTOs\AttachmentData;
use Vendor\Chat\Application\Handlers\Commands\DeleteRoomHandler;
use Vendor\Chat\Application\Handlers\Commands\SendMessageHandler;
use Vendor\Chat\Application\Handlers\Commands\UploadAttachmentHandler;
use Vendor\Chat\Application\Support\PendingAttachments;
use Vendor\Chat\Domain\Enums\RoomRole;
use Vendor\Chat\Domain\Models\Message;
use Vendor\Chat\Domain\Models\Room;
use Vendor\Chat\Domain\Models\RoomMember;
use Vendor\Chat\Presentation\Http\Api\V1\Requests\UploadAttachmentRequest;
use Vendor\Identity\Domain\Models\User;

beforeEach(function (): void {
    Storage::fake('media');
    Storage::fake('local');
});

/** Загрузка вложения от имени участника — как это делает контроллер. */
function uploadAttachment(Room $room, User $user, ?UploadedFile $file = null, ?string $name = null): AttachmentData
{
    $file ??= UploadedFile::fake()->image($name ?? 'photo.jpg', 640, 480);

    return app(UploadAttachmentHandler::class)->handle(new UploadAttachmentCommand(
        roomId: $room->id,
        uploaderId: (string) $user->getKey(),
        filePath: (string) $file->getRealPath(),
        fileName: $name ?? $file->getClientOriginalName(),
    ));
}

function sendWithAttachments(Room $room, User $author, array $attachmentIds, string $body = ''): Message
{
    $result = app(SendMessageHandler::class)->handle(new SendMessageCommand(
        roomId: $room->id,
        authorId: (string) $author->getKey(),
        body: $body,
        attachments: $attachmentIds,
    ));

    return Message::query()->findOrFail($result['message']->id);
}

function validateAttachmentFile(UploadedFile $file): Illuminate\Validation\Validator
{
    $request = new UploadAttachmentRequest;

    return Validator::make(['file' => $file], $request->rules(), $request->messages());
}

// --- 1.1: хранение -----------------------------------------------------------

it('stores the attachment in object storage under uploads/ and not on the local disk', function (): void {
    $room = Room::factory()->create();
    $user = User::factory()->create();

    $data = uploadAttachment($room, $user, name: 'kitchen.jpg');

    $media = Media::query()->where('uuid', $data->id)->firstOrFail();

    expect($media->disk)->toBe('media')
        ->and($media->collection_name)->toBe(Message::ATTACHMENTS)
        ->and($media->getPathRelativeToRoot())->toStartWith('uploads/');

    Storage::disk('media')->assertExists($media->getPathRelativeToRoot());
    expect(Storage::disk('local')->allFiles())->toBe([]);
});

it('keeps the original file as sent and reports image dimensions', function (): void {
    $room = Room::factory()->create();
    $user = User::factory()->create();

    $data = uploadAttachment($room, $user, UploadedFile::fake()->image('cat.png', 800, 600), 'cat.png');

    $media = Media::query()->where('uuid', $data->id)->firstOrFail();

    // Исходник не пережимается: скачивают ровно то, что отправили (design 5).
    expect($media->mime_type)->toBe('image/png')
        ->and($data->width)->toBe(800)
        ->and($data->height)->toBe(600)
        ->and($data->name)->toBe('cat.png')
        ->and($data->size)->toBeGreaterThan(0);
});

// --- 1.2: проверка принимаемого файла ---------------------------------------

it('rejects an executable renamed to look like a document', function (): void {
    // Настоящий заголовок PE-исполняемого: содержимое выдаёт подмену.
    $exe = UploadedFile::fake()->createWithContent('report.pdf', "MZ\x90\x00\x03\x00\x00\x00\x04\x00\x00\x00\xff\xff");

    $validator = validateAttachmentFile($exe);

    expect($validator->fails())->toBeTrue()
        ->and($validator->errors()->first('file'))->toContain('не совпадает');
});

it('rejects files with an executable or script extension', function (): void {
    $script = UploadedFile::fake()->createWithContent('backup.sh', "#!/bin/sh\necho hi\n");

    $validator = validateAttachmentFile($script);

    expect($validator->fails())->toBeTrue()
        ->and($validator->errors()->first('file'))->toContain('Исполняемые');
});

it('rejects files over the configured size limit', function (): void {
    config()->set('chat.attachments.max_size_kb', 100);
    $big = UploadedFile::fake()->createWithContent('paper.pdf', '%PDF-1.4 '.str_repeat('a', 200 * 1024));

    $validator = validateAttachmentFile($big);

    expect($validator->fails())->toBeTrue()
        ->and($validator->errors()->first('file'))->toContain('больше');
});

it('accepts a real pdf and a real image', function (): void {
    $pdf = UploadedFile::fake()->createWithContent('справка.pdf', "%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF");
    $image = UploadedFile::fake()->image('photo.jpg', 100, 100);

    expect(validateAttachmentFile($pdf)->passes())->toBeTrue()
        ->and(validateAttachmentFile($image)->passes())->toBeTrue();
});

it('refuses uploads over the per-message file count', function (): void {
    config()->set('chat.attachments.max_files', 2);
    $room = Room::factory()->create();
    $user = User::factory()->create();

    uploadAttachment($room, $user, name: 'one.jpg');
    uploadAttachment($room, $user, name: 'two.jpg');

    expect(fn () => uploadAttachment($room, $user, name: 'three.jpg'))
        ->toThrow(ValidationException::class);
});

// --- 1.4: захват вложений при отправке (доменная часть) ----------------------

it('sends an attachment-only message and hands the files over to it', function (): void {
    $room = Room::factory()->create();
    $author = User::factory()->create();
    RoomMember::factory()->for($room)->role(RoomRole::Member)->create(['user_id' => $author->getKey()]);

    $data = uploadAttachment($room, $author);
    $message = sendWithAttachments($room, $author, [$data->id]);

    expect($message->body)->toBe('')
        ->and($message->attachments())->toHaveCount(1)
        ->and((string) $message->attachments()->first()->uuid)->toBe($data->id)
        ->and(PendingAttachments::query($room->id)->count())->toBe(0);
});

it('keeps attachments in the order they were attached', function (): void {
    $room = Room::factory()->create();
    $author = User::factory()->create();

    // Загрузки шли параллельно и завершились в другом порядке — порядок
    // задаёт список в запросе отправки, как человек их приложил.
    $second = uploadAttachment($room, $author, name: 'second.jpg');
    $first = uploadAttachment($room, $author, name: 'first.jpg');

    $message = sendWithAttachments($room, $author, [$first->id, $second->id]);

    expect($message->attachments()->map(fn ($media) => $media->name)->all())
        ->toBe(['first.jpg', 'second.jpg']);
});

it('refuses a message with neither text nor attachments', function (): void {
    $room = Room::factory()->create();
    $author = User::factory()->create();

    expect(fn () => sendWithAttachments($room, $author, []))
        ->toThrow(ValidationException::class);
});

it('does not let someone attach a foreign upload', function (): void {
    $room = Room::factory()->create();
    $uploader = User::factory()->create();
    $author = User::factory()->create();

    $foreign = uploadAttachment($room, $uploader);

    expect(fn () => sendWithAttachments($room, $author, [$foreign->id], body: 'мои файлы'))
        ->toThrow(ValidationException::class);

    // Чужой файл остаётся у владельца, сообщение не создано.
    expect(PendingAttachments::query($room->id)->count())->toBe(1)
        ->and(Message::query()->where('room_id', $room->id)->count())->toBe(0);
});

// --- 1.5: миниатюра в очереди ------------------------------------------------

it('prepares the preview during the upload itself for a file within the threshold', function (): void {
    // Очередь подставная: если бы конверсия ушла в неё, миниатюры бы не было.
    Queue::fake();
    $room = Room::factory()->create();
    $user = User::factory()->create();

    $data = uploadAttachment($room, $user);

    $media = Media::query()->where('uuid', $data->id)->firstOrFail();

    // Ответ на загрузку уже несёт адрес миниатюры — серой плитки в ленте нет.
    expect($media->hasGeneratedConversion(Message::ATTACHMENT_PREVIEW))->toBeTrue()
        ->and($data->thumbUrl)->not->toBeNull();
    Queue::assertNotPushed(PerformConversionsJob::class);
    Storage::disk('media')->assertExists($media->getPathRelativeToRoot(Message::ATTACHMENT_PREVIEW));
});

it('queues the preview conversion on the media queue for a file over the threshold', function (): void {
    // Порог ниже размера снимка: тяжёлый файл не держит отправку (design 1).
    config()->set('chat.attachments.preview_sync_max_kb', 1);
    Queue::fake();
    $room = Room::factory()->create();
    $user = User::factory()->create();

    $data = uploadAttachment($room, $user, UploadedFile::fake()->image('big.jpg', 1600, 1200));

    $media = Media::query()->where('uuid', $data->id)->firstOrFail();

    expect($media->size)->toBeGreaterThan(1024)
        ->and($media->hasGeneratedConversion(Message::ATTACHMENT_PREVIEW))->toBeFalse()
        // Пока конверсия не выполнена, адреса миниатюры нет — клиент показывает
        // ожидание, а не сломанную картинку (spec chat/attachments).
        ->and($data->thumbUrl)->toBeNull();
    Queue::assertPushed(PerformConversionsJob::class, fn (PerformConversionsJob $job): bool => $job->queue === 'media');
});

it('serves the thumb address once the deferred conversion has run', function (): void {
    config()->set('chat.attachments.preview_sync_max_kb', 1);
    $room = Room::factory()->create();
    $user = User::factory()->create();

    // Синхронная очередь тестов: отложенная конверсия выполняется сразу.
    $data = uploadAttachment($room, $user, UploadedFile::fake()->image('big.jpg', 1600, 1200));
    $media = Media::query()->where('uuid', $data->id)->firstOrFail();

    $ready = AttachmentData::fromMedia($media);

    expect($media->hasGeneratedConversion(Message::ATTACHMENT_PREVIEW))->toBeTrue()
        ->and($ready->thumbUrl)->not->toBeNull();
    Storage::disk('media')->assertExists($media->getPathRelativeToRoot(Message::ATTACHMENT_PREVIEW));
});

it('gives non-images no thumb at all', function (): void {
    $room = Room::factory()->create();
    $user = User::factory()->create();

    $pdf = UploadedFile::fake()->createWithContent('paper.pdf', "%PDF-1.4\n%%EOF");
    $data = uploadAttachment($room, $user, $pdf, 'paper.pdf');

    expect($data->thumbUrl)->toBeNull()
        ->and($data->width)->toBeNull()
        ->and($data->height)->toBeNull();
});

// --- 1.7: удаление комнаты уносит файлы --------------------------------------

it('deletes room files including previews and leaves the neighbour room intact', function (): void {
    $room = Room::factory()->create();
    $author = User::factory()->create();
    RoomMember::factory()->for($room)->role(RoomRole::Owner)->create(['user_id' => $author->getKey()]);

    $sent = uploadAttachment($room, $author, name: 'sent.jpg');
    sendWithAttachments($room, $author, [$sent->id]);
    $pending = uploadAttachment($room, $author, name: 'pending.jpg');

    $neighbour = Room::factory()->create();
    $neighbourData = uploadAttachment($neighbour, $author, name: 'other.jpg');
    sendWithAttachments($neighbour, $author, [$neighbourData->id]);

    $paths = Media::query()->get()->keyBy(fn (Media $media): string => (string) $media->uuid)
        ->map(fn (Media $media): array => [
            'file' => $media->getPathRelativeToRoot(),
            'preview' => $media->getPathRelativeToRoot(Message::ATTACHMENT_PREVIEW),
        ]);

    app(DeleteRoomHandler::class)->handle(new DeleteRoomCommand($room->id, (string) $author->getKey()));

    // Файлы комнаты исчезли — и оригиналы, и миниатюры, и не отправленное.
    foreach ([$sent->id, $pending->id] as $gone) {
        Storage::disk('media')->assertMissing($paths[$gone]['file']);
        Storage::disk('media')->assertMissing($paths[$gone]['preview']);
    }

    // Записей о медиа комнаты не осталось, соседка не тронута.
    expect(Media::query()->count())->toBe(1);
    Storage::disk('media')->assertExists($paths[$neighbourData->id]['file']);
    Storage::disk('media')->assertExists($paths[$neighbourData->id]['preview']);
});

// --- 1.8: уборка неотправленного ---------------------------------------------

it('prunes stale unsent uploads and leaves sent and fresh ones alone', function (): void {
    $room = Room::factory()->create();
    $author = User::factory()->create();

    $sent = uploadAttachment($room, $author, name: 'sent.jpg');
    sendWithAttachments($room, $author, [$sent->id]);

    $stale = uploadAttachment($room, $author, name: 'stale.jpg');
    $fresh = uploadAttachment($room, $author, name: 'fresh.jpg');

    // Отправленное и висящее — старше суток; свежая загрузка — только что.
    Media::query()->whereIn('uuid', [$sent->id, $stale->id])
        ->update(['created_at' => now()->subHours(30)]);

    $stalePath = Media::query()->where('uuid', $stale->id)->firstOrFail()->getPathRelativeToRoot();

    $this->artisan('chat:attachments-prune')->assertExitCode(0);

    expect(Media::query()->where('uuid', $stale->id)->exists())->toBeFalse()
        ->and(Media::query()->where('uuid', $sent->id)->exists())->toBeTrue()
        ->and(Media::query()->where('uuid', $fresh->id)->exists())->toBeTrue();
    Storage::disk('media')->assertMissing($stalePath);
});
