<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('room_invites', function (Blueprint $table): void {
            $table->ulid('id')->primary();
            $table->foreignUlid('room_id')->constrained('rooms')->cascadeOnDelete();
            $table->string('created_by');
            // Токен ведёт себя как пароль: в базе только его хэш, чтобы утечка
            // дампа не отдавала рабочие ссылки.
            $table->string('token_hash', 64)->unique();
            $table->timestamp('expires_at')->index();
            $table->timestamp('revoked_at')->nullable();
            $table->unsignedInteger('uses')->default(0);
            $table->timestamp('last_used_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('room_invites');
    }
};
