<?php

declare(strict_types=1);

// Forward migration: колонка отметки прочитанного добавляется к существующей
// таблице room_members отдельной миграцией (CLAUDE.md §12 — не переписывать
// выпущенные миграции).

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('room_members', function (Blueprint $table): void {
            $table->ulid('last_read_message_id')->nullable()->after('joined_at');
        });
    }

    public function down(): void
    {
        Schema::table('room_members', function (Blueprint $table): void {
            $table->dropColumn('last_read_message_id');
        });
    }
};
