<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('home_gold_bindings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('commodity_id', 100);
            $table->string('mode', 20)->default('preview');
            $table->string('buy_field', 20)->default('buyPrice');
            $table->string('sell_field', 20)->default('sellPrice');
            $table->unsignedSmallInteger('currency_multiplier')->default(1);
            $table->decimal('unit_divisor', 18, 6)->default(1);
            $table->decimal('buy_percent', 8, 4)->default(0);
            $table->decimal('sell_percent', 8, 4)->default(0);
            $table->bigInteger('buy_offset_rial')->default(0);
            $table->bigInteger('sell_offset_rial')->default(0);
            $table->unsignedInteger('interval_seconds')->default(60);
            $table->unsignedInteger('stale_after_seconds')->default(180);
            $table->timestampTz('last_attempt_at')->nullable();
            $table->timestampTz('last_success_at')->nullable();
            $table->text('last_error')->nullable();
            $table->json('last_quote')->nullable();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestampsTz();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('home_gold_bindings');
    }
};
