<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('audit_logs', function (Blueprint $table): void {
            $table->ulid('id')->primary();
            // Актор хранится идентификатором и подписью на момент действия:
            // удаление пользователя не должно стирать след.
            $table->string('actor_id')->nullable()->index();
            $table->string('actor_label')->nullable();
            $table->string('action')->index();
            $table->string('subject_type')->nullable();
            $table->string('subject_id')->nullable();
            // Только безопасные метаданные: секреты и приватный текст сюда не попадают.
            $table->json('context')->nullable();
            $table->timestamp('created_at')->index();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
    }
};
