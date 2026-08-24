<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ai_requests', function (Blueprint $table): void {
            $table->ulid('id')->primary();
            $table->foreignUlid('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('operation', 24);
            $table->string('provider', 64);
            $table->string('model', 128)->nullable();
            $table->string('status', 24);
            $table->unsignedInteger('prompt_tokens')->default(0);
            $table->unsignedInteger('completion_tokens')->default(0);
            // Стоимость в минимальных единицах валюты (CLAUDE.md §7).
            $table->unsignedInteger('cost_minor')->default(0);
            $table->unsignedInteger('input_length')->default(0);
            $table->unsignedInteger('duration_ms')->default(0);
            // Только безопасная диагностика: ни промпта, ни ответа, ни ключей.
            $table->string('failure_reason', 255)->nullable();
            $table->timestamps();

            $table->index(['user_id', 'created_at']);
            $table->index(['status', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_requests');
    }
};
