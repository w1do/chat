<?php

declare(strict_types=1);

/**
 * Сборка итогового OpenAPI 3.1: openapi.base.yaml + фрагменты пакетов
 * (packages/backend/<pkg>/openapi/{paths,schemas}/*.yaml) → dist/openapi.json.
 *
 * Контракт фрагментов:
 *  - paths/*.yaml   — карта "/path" → операции; пути не должны конфликтовать
 *                     между пакетами (конфликт — ошибка сборки);
 *  - schemas/*.yaml — имя файла = имя схемы в components.schemas
 *                     (Room.yaml → #/components/schemas/Room).
 *
 * Запуск: php openapi/build.php [--check]
 *   --check: не пишет dist, а сверяет его с результатом сборки (для CI).
 */

require __DIR__.'/../vendor/autoload.php';

use Symfony\Component\Yaml\Yaml;

$check = in_array('--check', $argv, true);

$base = Yaml::parseFile(__DIR__.'/openapi.base.yaml');
$base['paths'] = is_array($base['paths'] ?? null) ? $base['paths'] : [];
$base['components']['schemas'] ??= [];

$packagesDir = dirname(__DIR__, 3).'/packages/backend';
$pathOwners = [];

foreach (glob($packagesDir.'/*/openapi/paths/*.yaml') ?: [] as $fragment) {
    $package = basename(dirname($fragment, 3));
    $paths = Yaml::parseFile($fragment);

    if (! is_array($paths)) {
        fwrite(STDERR, "Invalid paths fragment (not a map): {$fragment}\n");
        exit(1);
    }

    foreach ($paths as $path => $operations) {
        if (isset($pathOwners[$path])) {
            fwrite(STDERR, "Path conflict: {$path} defined by {$pathOwners[$path]} and {$package}\n");
            exit(1);
        }
        $pathOwners[$path] = $package;
        $base['paths'][$path] = $operations;
    }
}

foreach (glob($packagesDir.'/*/openapi/schemas/*.yaml') ?: [] as $fragment) {
    $name = pathinfo($fragment, PATHINFO_FILENAME);
    $schema = Yaml::parseFile($fragment);

    if (! is_array($schema)) {
        fwrite(STDERR, "Invalid schema fragment (not a map): {$fragment}\n");
        exit(1);
    }

    if (isset($base['components']['schemas'][$name])) {
        fwrite(STDERR, "Schema conflict: {$name} already defined\n");
        exit(1);
    }

    $base['components']['schemas'][$name] = $schema;
}

ksort($base['paths']);
ksort($base['components']['schemas']);

if ($base['paths'] === []) {
    $base['paths'] = new stdClass;
}
if ($base['components']['schemas'] === []) {
    unset($base['components']['schemas']);
}

$json = json_encode($base, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)."\n";
$distFile = __DIR__.'/dist/openapi.json';

if ($check) {
    $current = is_file($distFile) ? file_get_contents($distFile) : null;
    if ($current !== $json) {
        fwrite(STDERR, "openapi/dist/openapi.json is out of date. Run: php openapi/build.php\n");
        exit(1);
    }
    echo "openapi dist is up to date\n";
    exit(0);
}

if (! is_dir(__DIR__.'/dist')) {
    mkdir(__DIR__.'/dist', 0755, true);
}
file_put_contents($distFile, $json);
echo 'Wrote '.$distFile.' ('.count($pathOwners)." package paths)\n";
