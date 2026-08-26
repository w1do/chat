<?php

declare(strict_types=1);

// Forward migration: вид переписки и ключ пары добавляются к выпущенной
// таблице rooms отдельной миграцией (CLAUDE.md §12). Существующие строки
// получают вид «комната» значением по умолчанию.

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('rooms', function (Blueprint $table): void {
            $table->string('kind', 16)->default('room')->index()->after('visibility'); // room | direct
            // Ключ пары участников диалога: оба ULID, упорядоченные одинаково
            // независимо от того, кто начал («a:b»). У комнат ключа нет.
            $table->string('direct_key', 64)->nullable()->after('kind');
        });

        // Одна переписка на пару: встречное одновременное начало упирается в
        // индекс, а не в проверку перед вставкой (частичный уникальный индекс,
        // поддерживается PostgreSQL и SQLite — тот же приём, что и
        // room_members_single_owner).
        DB::statement("CREATE UNIQUE INDEX rooms_direct_pair ON rooms (direct_key) WHERE kind = 'direct'");
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS rooms_direct_pair');

        Schema::table('rooms', function (Blueprint $table): void {
            $table->dropColumn(['kind', 'direct_key']);
        });
    }
};
