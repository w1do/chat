<?php

declare(strict_types=1);

// Стандартная таблица Laravel Notifications (CLAUDE.md §7) плюс поля для
// группировки: повторяющиеся события комнаты обновляют одну запись.

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('notifications', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->string('type');
            $table->ulidMorphs('notifiable');
            $table->json('data');
            $table->timestamp('read_at')->nullable();
            $table->timestamps();

            // Ключ группировки: категория + комната (или иной источник).
            $table->string('group_key', 128)->nullable();
            $table->unsignedInteger('group_count')->default(1);

            $table->index(['notifiable_id', 'read_at']);
            $table->index(['notifiable_id', 'group_key']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notifications');
    }
};
