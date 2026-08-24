<?php

declare(strict_types=1);

namespace Vendor\Notifications\Infrastructure\Channels;

use Illuminate\Contracts\Mail\Mailer;
use Illuminate\Mail\Message;
use Vendor\Notifications\Domain\Enums\Category;

/**
 * Почтовый канал. Адресат может не иметь почты (вход по логину, ADR-005) —
 * тогда письмо просто не отправляется.
 */
final readonly class MailChannelSender
{
    public function __construct(private Mailer $mailer) {}

    /** @param array<string, mixed> $payload */
    public function send(string $recipientId, Category $category, array $payload): void
    {
        $userModel = config('auth.providers.users.model');
        $recipient = $userModel::query()->find($recipientId);
        $email = $recipient?->email;

        if ($email === null) {
            return;
        }

        $subject = match ($payload['category'] ?? $category->value) {
            'digest' => 'Непрочитанные сообщения в чате',
            'mention' => 'Вас упомянули в чате',
            'room_invite' => 'Вас пригласили в комнату',
            default => 'Новые сообщения в чате',
        };

        $lines = $this->lines($payload);

        $this->mailer->raw(implode("\n", $lines), function (Message $message) use ($email, $subject): void {
            $message->to($email)->subject($subject);
        });
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return list<string>
     */
    private function lines(array $payload): array
    {
        if (($payload['category'] ?? null) === 'digest') {
            return ["У вас {$payload['unread']} непрочитанных уведомлений в чате."];
        }

        return array_values(array_filter([
            isset($payload['room_name']) ? "Комната: {$payload['room_name']}" : null,
            isset($payload['actor_name']) ? "От кого: {$payload['actor_name']}" : null,
            // Превью короткое: полный текст остаётся в чате.
            ! empty($payload['preview']) ? "Сообщение: {$payload['preview']}" : null,
            'Откройте чат, чтобы ответить.',
        ]));
    }
}
