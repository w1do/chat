<?php

declare(strict_types=1);

// Forward migration: системные сообщения живут в общей ленте как вид сообщения
// (design 1c). Текст системной записи рендерит клиент из payload, поэтому
// формулировку и язык можно менять без переписывания истории.

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('messages', function (Blueprint $table): void {
            $table->string('kind', 24)->default('text')->after('room_id');
            $table->json('payload')->nullable()->after('mentions');
            $table->index(['room_id', 'kind']);
        });
    }

    public function down(): void
    {
        Schema::table('messages', function (Blueprint $table): void {
            $table->dropIndex(['room_id', 'kind']);
            $table->dropColumn(['kind', 'payload']);
        });
    }
};
