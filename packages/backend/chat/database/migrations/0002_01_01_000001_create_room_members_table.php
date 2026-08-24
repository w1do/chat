<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('room_members', function (Blueprint $table): void {
            $table->ulid('id')->primary();
            $table->foreignUlid('room_id')->constrained('rooms')->cascadeOnDelete();
            $table->foreignUlid('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('role', 16); // owner | admin | member
            $table->timestamp('joined_at');
            $table->timestamps();

            $table->unique(['room_id', 'user_id']);
            $table->index(['user_id', 'room_id']);
        });

        // Ровно один owner на комнату (частичный уникальный индекс,
        // поддерживается PostgreSQL и SQLite).
        DB::statement("CREATE UNIQUE INDEX room_members_single_owner ON room_members (room_id) WHERE role = 'owner'");
    }

    public function down(): void
    {
        Schema::dropIfExists('room_members');
    }
};
