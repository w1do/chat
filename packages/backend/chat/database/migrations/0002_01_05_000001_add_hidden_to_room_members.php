<?php

declare(strict_types=1);

// Forward migration: отметка скрытия диалога живёт у записи участия — скрытие
// одного собеседника не видно другому (design 4).

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('room_members', function (Blueprint $table): void {
            $table->timestamp('hidden_at')->nullable()->after('last_read_message_id');
        });
    }

    public function down(): void
    {
        Schema::table('room_members', function (Blueprint $table): void {
            $table->dropColumn('hidden_at');
        });
    }
};
