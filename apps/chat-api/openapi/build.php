<?php

declare(strict_types=1);

/**
 * Сборка итогового OpenAPI: openapi.base.yaml + фрагменты paths/schemas
 * подключённых backend-пакетов → dist/openapi.json.
 *
 * Полная реализация merge — этап 3 (задача 3.2). Скрипт уже сейчас падает,
 * если фрагмент пакета не парсится, чтобы мусор не копился до этапа 3.
 */

require __DIR__.'/../vendor/autoload.php';

use Symfony\Component\Yaml\Yaml;

$base = Yaml::parseFile(__DIR__.'/openapi.base.yaml');

$packagesDir = dirname(__DIR__, 3).'/packages/backend';

foreach (glob($packagesDir.'/*/openapi/{paths,schemas}/*.yaml', GLOB_BRACE) ?: [] as $fragment) {
    Yaml::parseFile($fragment); // валидация фрагментов; merge — задача 3.2
}

echo "OpenAPI base parsed. Full assembly is implemented in Stage 3 (task 3.2).\n";
