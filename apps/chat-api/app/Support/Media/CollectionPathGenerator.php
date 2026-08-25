<?php

declare(strict_types=1);

namespace App\Support\Media;

use Spatie\MediaLibrary\MediaCollections\Models\Media;
use Spatie\MediaLibrary\Support\PathGenerator\DefaultPathGenerator;

/**
 * Раскладка бакета по видам медиа: назначение файла видно по его пути
 * (uploads/, avatars/, rooms/, wallpapers/ — см. config/media.php).
 * Внутри префикса — стандартная схема medialibrary: {id}/файл.
 */
final class CollectionPathGenerator extends DefaultPathGenerator
{
    protected function getBasePath(Media $media): string
    {
        $prefixes = (array) config('media.prefixes', []);
        $prefix = (string) ($prefixes[$media->collection_name] ?? config('media.default_prefix', 'uploads'));

        return $prefix.'/'.$media->getKey();
    }
}
