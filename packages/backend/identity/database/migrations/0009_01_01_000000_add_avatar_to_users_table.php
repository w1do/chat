<?php

declare(strict_types=1);

// Forward migration: указатель текущей аватарки. Сами файлы живут в коллекции
// медиа (design 2) — здесь только «какая из них показывается сейчас», чтобы
// выбор прежней не означал перезапись файла в хранилище.

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            // media.id — bigint; связь без FK: таблица медиа принадлежит
            // библиотеке, и жёсткая ссылка на неё связала бы миграции пакетов.
            $table->unsignedBigInteger('avatar_media_id')->nullable()->after('name');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->dropColumn('avatar_media_id');
        });
    }
};
