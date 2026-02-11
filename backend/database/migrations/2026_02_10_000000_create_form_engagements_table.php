<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('form_engagements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('form_id')->constrained()->cascadeOnDelete();
            $table->string('student_id')->nullable()->index();
            $table->enum('status', ['viewed', 'submitted'])->default('viewed');
            $table->timestamp('viewed_at')->nullable();
            $table->timestamp('submitted_at')->nullable();
            $table->timestamps();

            $table->unique(['form_id', 'student_id']);
            $table->index(['form_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('form_engagements');
    }
};
