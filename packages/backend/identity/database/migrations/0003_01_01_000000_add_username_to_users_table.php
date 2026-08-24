<?php

declare(strict_types=1);

// Forward migration: вход по логину (design 1b). Почта становится
// необязательной и задаётся в настройках; выпущенные миграции не переписываем.

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->string('username', 64)->nullable()->after('id');
        });

        // Существующим аккаунтам логин выводится из локальной части почты.
        foreach (DB::table('users')->select('id', 'email')->get() as $user) {
            $base = mb_substr((string) preg_replace('/[^a-z0-9_.-]/', '', mb_strtolower((string) strstr((string) $user->email, '@', true))), 0, 32);
            $login = $base !== '' ? $base : 'user';
            $candidate = $login;
            $suffix = 1;

            while (DB::table('users')->where('username', $candidate)->exists()) {
                $candidate = $login.$suffix;
                $suffix++;
            }

            DB::table('users')->where('id', $user->id)->update(['username' => $candidate]);
        }

        Schema::table('users', function (Blueprint $table): void {
            $table->string('username', 64)->nullable(false)->change();
            $table->unique('username');
            // Почта необязательна; уникальность сохраняется для заполненных значений.
            $table->string('email')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->dropUnique(['username']);
            $table->dropColumn('username');
            $table->string('email')->nullable(false)->change();
        });
    }
};
