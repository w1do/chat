<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('messages', function (Blueprint $table): void {
            $table->ulid('id')->primary();
            $table->foreignUlid('room_id')->constrained('rooms')->cascadeOnDelete();
            $table->foreignUlid('author_id')->constrained('users')->restrictOnDelete();
            // reply_to_id: self-FK добавляется после создания таблицы (см. ниже).
            $table->ulid('reply_to_id')->nullable();
            $table->text('body');
            $table->json('mentions')->nullable();
            $table->timestamp('edited_at')->nullable();
            $table->softDeletes();
            $table->timestamps();

            // Cursor-пагинация: ULID id монотонен, (room_id, id) покрывает выборку истории.
            $table->index(['room_id', 'id']);
            $table->index('reply_to_id');
        });

        // Ответы: soft delete родителя сохраняет связь; жёсткое удаление запрещено FK.
        Schema::table('messages', function (Blueprint $table): void {
            $table->foreign('reply_to_id')->references('id')->on('messages')->restrictOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('messages');
    }
};
