<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            // Пустое значение означает, что пароль выдан системой (аккаунт по
            // приглашению) и человек его ещё не менял. Существующие аккаунты
            // остаются пустыми: подсказка им не показывается.
            $table->timestamp('password_set_at')->nullable()->after('password');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->dropColumn('password_set_at');
        });
    }
};
