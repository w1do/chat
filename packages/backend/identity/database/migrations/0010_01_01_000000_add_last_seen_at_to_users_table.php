<?php

declare(strict_types=1);

// Forward migration: момент последней активности человека. По нему интерфейс
// показывает «в сети» и «был(а) в сети …»; запись троттлится (design 1),
// поэтому колонка обычной точности и без индекса — читается всегда по id.

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->timestamp('last_seen_at')->nullable()->after('password_set_at');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->dropColumn('last_seen_at');
        });
    }
};
