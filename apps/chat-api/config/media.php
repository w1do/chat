<?php

declare(strict_types=1);

// Раскладка объектного хранилища: какой коллекции медиа какой префикс бакета.
// Новая коллекция получает свой префикс здесь — путь описан один раз (ADR-011).
return [

    'prefixes' => [
        'attachments' => 'uploads',
        'avatars' => 'avatars',
        'room-photo' => 'rooms',
        'wallpaper' => 'wallpapers',
    ],

    // Неизвестная коллекция падает в uploads: файл не должен лечь в корень бакета.
    'default_prefix' => 'uploads',

];
