<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('rooms', function (Blueprint $table): void {
            $table->ulid('id')->primary();
            $table->string('name');
            $table->string('topic', 500)->nullable();
            $table->string('visibility', 16)->index(); // public | private
            $table->foreignUlid('created_by')->constrained('users')->restrictOnDelete();
            $table->timestamp('archived_at')->nullable()->index();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('rooms');
    }
};
