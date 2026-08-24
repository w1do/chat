<?php

declare(strict_types=1);
use App\Models\User;

// Только опубликованные оверрайды конфигурации пакета vendor/identity (§2).
return [
    'user_model' => User::class,
];
