<?php

declare(strict_types=1);

namespace Vendor\Chat\Application\Handlers\Commands;

use Illuminate\Validation\ValidationException;
use Vendor\Chat\Application\Commands\UploadAttachmentCommand;
use Vendor\Chat\Application\DTOs\AttachmentData;
use Vendor\Chat\Application\Support\PendingAttachments;
use Vendor\Chat\Domain\Models\Message;
use Vendor\Chat\Domain\Models\Room;
use Vendor\Chat\Domain\ValueObjects\AttachmentRules;

/**
 * Приём файла вложения. Формат и белый список проверены на входе; здесь —
 * предел количества и запись в объектное хранилище. До отправки сообщения
 * файл принадлежит автору и комнате (design 3).
 */
final readonly class UploadAttachmentHandler
{
    public function handle(UploadAttachmentCommand $command): AttachmentData
    {
        /** @var Room $room */
        $room = Room::query()->findOrFail($command->roomId);
        $rules = AttachmentRules::fromConfig((array) config('chat.attachments', []));

        if (PendingAttachments::countFor($room->id, $command->uploaderId) >= $rules->maxFiles) {
            throw ValidationException::withMessages([
                'file' => ["К одному сообщению можно приложить не больше {$rules->maxFiles} файлов."],
            ]);
        }

        $properties = ['uploader_id' => $command->uploaderId];

        // Размеры исходного изображения — чтобы клиент разложил плитки, не
        // загружая файл; для не-изображений getimagesize вернёт false.
        $dimensions = @getimagesize($command->filePath);
        if (is_array($dimensions)) {
            $properties['width'] = (int) $dimensions[0];
            $properties['height'] = (int) $dimensions[1];
        }

        $media = $room->addMedia($command->filePath)
            ->usingName($command->fileName)
            ->usingFileName(self::storableFileName($command->fileName))
            ->withCustomProperties($properties)
            ->toMediaCollection(Message::ATTACHMENTS);

        return AttachmentData::fromMedia($media);
    }

    /** Имя в хранилище и в Content-Disposition: без спецсимволов и мусора. */
    private static function storableFileName(string $original): string
    {
        $extension = mb_strtolower(pathinfo($original, PATHINFO_EXTENSION));
        $base = trim((string) preg_replace('/[^\p{L}\p{N} _.\-]+/u', '_', pathinfo($original, PATHINFO_FILENAME)));

        return mb_substr($base === '' ? 'file' : $base, 0, 120).'.'.$extension;
    }
}
