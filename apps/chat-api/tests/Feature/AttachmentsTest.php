<?php

declare(strict_types=1);

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Spatie\MediaLibrary\Conversions\Jobs\PerformConversionsJob;
use Vendor\Chat\Domain\Enums\RoomRole;
use Vendor\Chat\Domain\Models\Room;
use Vendor\Chat\Domain\Models\RoomMember;

uses(RefreshDatabase::class);

beforeEach(function (): void {
    Storage::fake('media');
});

function attachmentRoomMember(Room $room, RoomRole $role = RoomRole::Member): User
{
    $user = User::factory()->create();
    RoomMember::factory()->for($room)->role($role)->create(['user_id' => $user->getKey()]);

    return $user;
}

/** Загрузка файла участником; возвращает тело вложения из ответа. */
function uploadAs(User $user, Room $room, ?UploadedFile $file = null): array
{
    return test()->actingAs($user)
        ->post("/api/v1/rooms/{$room->id}/attachments", [
            'file' => $file ?? UploadedFile::fake()->image('photo.jpg', 640, 480),
        ], ['Accept' => 'application/json'])
        ->assertCreated()
        ->json('data');
}

// --- Загрузка (1.3) ----------------------------------------------------------

it('lets a member upload an attachment and describes it', function (): void {
    $room = Room::factory()->privateRoom()->create();
    $member = attachmentRoomMember($room);

    $data = uploadAs($member, $room);

    expect($data['id'])->toBeString()
        ->and($data['name'])->toBe('photo.jpg')
        ->and($data['mime_type'])->toBe('image/jpeg')
        ->and($data['size'])->toBeGreaterThan(0)
        ->and($data['url'])->toContain('/attachments/')
        ->and($data['width'])->toBe(640)
        ->and($data['height'])->toBe(480);
});

it('answers the upload of an ordinary photo with a thumb that already works', function (): void {
    // Очередь подставная: конверсия обязана пройти прямо в запросе загрузки,
    // иначе в ленте останется серая плитка (spec chat/attachments).
    Queue::fake();
    $room = Room::factory()->privateRoom()->create();
    $member = attachmentRoomMember($room);

    $data = uploadAs($member, $room);

    expect($data['thumb_url'])->not->toBeNull();
    Queue::assertNotPushed(PerformConversionsJob::class);

    $thumb = $this->actingAs($member)->get($data['thumb_url'])->assertOk();
    expect($thumb->headers->get('content-type'))->toBe('image/webp');
});

it('defers the thumb of a heavy image to the media queue and serves it once run', function (): void {
    config()->set('chat.attachments.preview_sync_max_kb', 1);
    $room = Room::factory()->privateRoom()->create();
    $member = attachmentRoomMember($room);

    Queue::fake();
    $data = uploadAs($member, $room, UploadedFile::fake()->image('big.jpg', 1600, 1200));

    // Тяжёлый файл не держит отправку: миниатюра готовится в очереди media.
    expect($data['thumb_url'])->toBeNull();
    Queue::assertPushed(PerformConversionsJob::class, fn (PerformConversionsJob $job): bool => $job->queue === 'media');

    // Сообщение уходит и без готовой миниатюры.
    $messageId = $this->actingAs($member)
        ->postJson("/api/v1/rooms/{$room->id}/messages", ['attachments' => [$data['id']]])
        ->assertCreated()
        ->json('data.id');

    $this->getJson("/api/v1/messages/{$messageId}")
        ->assertOk()
        ->assertJsonPath('data.attachments.0.thumb_url', null);

    // Очередь прогоняем — тем же job'ом, что и Horizon.
    Queue::pushed(PerformConversionsJob::class)->each(fn (PerformConversionsJob $job) => app()->call([$job, 'handle']));

    $thumbUrl = $this->getJson("/api/v1/messages/{$messageId}")->assertOk()->json('data.attachments.0.thumb_url');

    expect($thumbUrl)->not->toBeNull();
    $this->get($thumbUrl)->assertOk();
});

it('forbids an outsider to upload into a private room', function (): void {
    $room = Room::factory()->privateRoom()->create();
    $outsider = User::factory()->create();

    $this->actingAs($outsider)
        ->post("/api/v1/rooms/{$room->id}/attachments", [
            'file' => UploadedFile::fake()->image('photo.jpg'),
        ], ['Accept' => 'application/json'])
        ->assertStatus(403);
});

it('rejects a file of a type outside the whitelist', function (): void {
    $room = Room::factory()->create();
    $member = attachmentRoomMember($room);

    $this->actingAs($member)
        ->post("/api/v1/rooms/{$room->id}/attachments", [
            'file' => UploadedFile::fake()->createWithContent('tool.exe', "MZ\x90\x00\x03\x00\x00\x00"),
        ], ['Accept' => 'application/json'])
        ->assertStatus(422)
        ->assertJsonPath('code', 'validation_failed');
});

// --- Отправка сообщения с вложениями (1.4, 2.1) ------------------------------

it('sends an attachment-only message and shows it in history', function (): void {
    $room = Room::factory()->create();
    $member = attachmentRoomMember($room);
    $data = uploadAs($member, $room);

    $send = $this->actingAs($member)
        ->postJson("/api/v1/rooms/{$room->id}/messages", ['attachments' => [$data['id']]])
        ->assertCreated();

    expect($send->json('data.attachments.0.id'))->toBe($data['id'])
        ->and($send->json('data.attachments.0.thumb_url'))->not->toBeNull()
        ->and($send->json('data.body'))->toBe('');

    $this->getJson("/api/v1/rooms/{$room->id}/messages")
        ->assertOk()
        ->assertJsonPath('data.0.attachments.0.id', $data['id'])
        ->assertJsonPath('data.0.attachments.0.name', 'photo.jpg');
});

it('rejects a message with neither text nor attachments', function (): void {
    $room = Room::factory()->create();
    $member = attachmentRoomMember($room);

    $this->actingAs($member)
        ->postJson("/api/v1/rooms/{$room->id}/messages", [])
        ->assertStatus(422)
        ->assertJsonPath('code', 'validation_failed');
});

it('refuses to attach an upload that belongs to someone else', function (): void {
    $room = Room::factory()->create();
    $uploader = attachmentRoomMember($room);
    $author = attachmentRoomMember($room);
    $foreign = uploadAs($uploader, $room);

    $this->actingAs($author)
        ->postJson("/api/v1/rooms/{$room->id}/messages", ['body' => 'моё', 'attachments' => [$foreign['id']]])
        ->assertStatus(422);
});

it('keeps the attachments list empty for plain messages and absent for deleted ones', function (): void {
    $room = Room::factory()->create();
    $member = attachmentRoomMember($room);
    $data = uploadAs($member, $room);

    $plain = $this->actingAs($member)
        ->postJson("/api/v1/rooms/{$room->id}/messages", ['body' => 'просто текст'])
        ->assertCreated();
    expect($plain->json('data.attachments'))->toBe([]);

    $withFile = $this->postJson("/api/v1/rooms/{$room->id}/messages", ['attachments' => [$data['id']]])
        ->assertCreated();
    $messageId = $withFile->json('data.id');

    $this->deleteJson("/api/v1/messages/{$messageId}")->assertNoContent();

    $deleted = collect($this->getJson("/api/v1/rooms/{$room->id}/messages")->json('data'))
        ->firstWhere('id', $messageId);

    // У удалённого сообщения вложения не перечисляются вовсе (spec).
    expect($deleted['deleted'])->toBeTrue()
        ->and($deleted)->not->toHaveKey('attachments');
});

// --- Выдача файла (1.6) ------------------------------------------------------

/** Комната с отправленным вложением: [room, author, attachment, messageId]. */
function roomWithSentAttachment(): array
{
    $room = Room::factory()->privateRoom()->create();
    $author = attachmentRoomMember($room);
    $data = uploadAs($author, $room);

    $message = test()->actingAs($author)
        ->postJson("/api/v1/rooms/{$room->id}/messages", ['attachments' => [$data['id']]])
        ->assertCreated()
        ->json('data');

    // Адреса берутся из сообщения: к этому моменту миниатюра уже готова.
    return [$room, $author, $message['attachments'][0], $message['id']];
}

it('serves the file to a member as a download and the thumb inline', function (): void {
    [$room, $author, $data] = roomWithSentAttachment();
    $reader = attachmentRoomMember($room);

    $file = $this->actingAs($reader)->get($data['url'])->assertOk();
    expect($file->headers->get('content-disposition'))->toStartWith('attachment')
        ->and($file->headers->get('content-type'))->toBe('image/jpeg')
        ->and($file->headers->get('x-content-type-options'))->toBe('nosniff');

    $thumb = $this->get($data['thumb_url'])->assertOk();
    expect($thumb->headers->get('content-type'))->toBe('image/webp');
});

it('hides the file from outsiders and from removed members', function (): void {
    [$room, $author, $data] = roomWithSentAttachment();

    $outsider = User::factory()->create();
    $this->actingAs($outsider)->get($data['url'])->assertNotFound();
    $this->actingAs($outsider)->get($data['thumb_url'])->assertNotFound();

    $removed = attachmentRoomMember($room);
    $this->actingAs($removed)->get($data['url'])->assertOk();
    RoomMember::query()->where('room_id', $room->id)->where('user_id', $removed->getKey())->delete();
    $this->actingAs($removed)->get($data['url'])->assertNotFound();
});

it('stops serving attachments of a deleted message', function (): void {
    [$room, $author, $data, $messageId] = roomWithSentAttachment();

    $this->actingAs($author)->get($data['url'])->assertOk();
    $this->deleteJson("/api/v1/messages/{$messageId}")->assertNoContent();

    $this->get($data['url'])->assertNotFound();
    $this->get($data['thumb_url'])->assertNotFound();
});

it('requires authentication for attachment files', function (): void {
    [, , $data] = roomWithSentAttachment();

    // Подготовка шла под actingAs: гостя изображаем, сбросив guard.
    app('auth')->forgetGuards();

    // Гость не получает ни файла, ни подтверждения его существования.
    $this->getJson($data['url'])->assertStatus(401);
});
