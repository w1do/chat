<?php

declare(strict_types=1);

namespace Vendor\Chat\Presentation\Http\Api\V1\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Http\UploadedFile;
use Symfony\Component\Mime\MimeTypes;
use Vendor\Chat\Domain\ValueObjects\AttachmentRules;

/**
 * Файл вложения: расширение из белого списка, фактический тип содержимого
 * совпадает с ним, исполняемое отклоняется. Тип определяется по содержимому
 * файла — заявленному клиентом Content-Type не верим (§11, design 6).
 */
final class AttachmentFile implements ValidationRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! $value instanceof UploadedFile || ! $value->isValid()) {
            $fail('Файл не загрузился.');

            return;
        }

        $rules = AttachmentRules::fromConfig((array) config('chat.attachments', []));
        $realMime = (string) MimeTypes::getDefault()->guessMimeType((string) $value->getRealPath());

        $reason = $rules->rejectionReason((string) $value->getClientOriginalName(), $realMime);

        if ($reason !== null) {
            $fail($reason);
        }
    }
}
