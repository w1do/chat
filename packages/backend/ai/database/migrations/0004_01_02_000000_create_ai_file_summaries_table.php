<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ai_file_summaries', function (Blueprint $table): void {
            $table->ulid('id')->primary();
            $table->foreignUlid('user_id')->constrained('users')->cascadeOnDelete();
            // Общий журнал обращений к AI: расход и итог операции лежат там.
            $table->foreignUlid('ai_request_id')->nullable()->constrained('ai_requests')->nullOnDelete();
            // Комната, сообщение и вложение принадлежат пакету chat: внешним
            // ключом сюда не тянемся, иначе таблицы пакетов срастаются (§4.1).
            $table->ulid('room_id');
            $table->ulid('message_id');
            $table->string('attachment_id', 64);
            $table->string('file_name', 255);
            $table->string('mime_type', 128);
            $table->unsignedBigInteger('file_size');
            $table->string('idempotency_key', 64)->nullable();
            $table->string('locale', 8);
            $table->string('status', 16);
            // Черновик: приватный текст автора запроса до публикации.
            $table->text('summary')->nullable();
            $table->string('error_code', 32)->nullable();
            $table->string('provider', 64);
            $table->string('model', 128)->nullable();
            $table->unsignedInteger('prompt_tokens')->default(0);
            $table->unsignedInteger('completion_tokens')->default(0);
            $table->unsignedInteger('cost_minor')->default(0);
            $table->unsignedInteger('duration_ms')->default(0);
            $table->ulid('published_message_id')->nullable();
            $table->timestamps();

            // Повтор сетевого запроса с тем же ключом — та же операция.
            // NULL-ключи в уникальном индексе не конфликтуют: запрос без
            // ключа всегда заводит новую операцию.
            $table->unique(['user_id', 'message_id', 'idempotency_key'], 'ai_file_summaries_idempotency_unique');
            $table->index(['user_id', 'created_at']);
            $table->index(['status', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_file_summaries');
    }
};
