<?php

declare(strict_types=1);

use App\Support\Media\CollectionPathGenerator;

// Переопределения поверх конфигурации spatie/laravel-medialibrary: провайдер
// пакета сливает их с собственными значениями, поэтому здесь только то, что
// проект решает сам (ADR-011). Полный список ключей — в vendor-конфиге пакета.
return [

    // Файлы живут только в объектном хранилище; локальный диск — не место
    // постоянного хранения (spec platform/object-storage).
    'disk_name' => env('MEDIA_DISK', 'media'),

    // Конверсии готовятся в своей очереди: пачка фотографий не должна
    // задерживать живую переписку и уведомления.
    'queue_name' => env('MEDIA_QUEUE', 'media'),
    'queue_connection_name' => env('QUEUE_CONNECTION', 'sync'),

    // Путь в бакете — по виду медиа (config/media.php).
    'path_generator' => CollectionPathGenerator::class,

    // Производные изображения собирает GD: один драйвер, без imagick в образе.
    'image_driver' => env('IMAGE_DRIVER', 'gd'),

];
