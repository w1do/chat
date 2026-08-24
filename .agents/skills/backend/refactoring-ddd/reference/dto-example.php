<?php

namespace App\Domain\Shared\DTO;

/**
 * Пример реализации DTO (Data Transfer Object).
 * Используется для передачи типизированных данных между слоями.
 */
readonly class UpdateProfileDTO
{
    /**
     * @param string $name Имя пользователя
     * @param string $email Email (валидированный)
     * @param array<string, mixed> $settings Дополнительные настройки
     */
    public function __construct(
        public string $name,
        public string $email,
        public array $settings = [],
    ) {}

    /**
     * Создание DTO из Request или массива.
     */
    public static function fromArray(array $data): self
    {
        return new self(
            name: $data['name'],
            email: $data['email'],
            settings: $data['settings'] ?? [],
        );
    }
}
