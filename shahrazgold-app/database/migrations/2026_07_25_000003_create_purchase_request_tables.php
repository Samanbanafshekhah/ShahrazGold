<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('purchase_requests', function (Blueprint $table) {
            $table->id();
            $table->string('request_number')->unique();
            $table->uuid('client_reference');
            $table->foreignId('user_id')->constrained()->restrictOnDelete();
            $table->foreignId('product_id')->constrained()->restrictOnDelete();
            $table->foreignId('product_price_id')->constrained()->restrictOnDelete();
            $table->string('trade_type', 30);
            $table->string('entry_mode', 20);
            $table->decimal('requested_quantity', 24, 6)->nullable();
            $table->unsignedBigInteger('requested_amount_rial')->nullable();
            $table->decimal('calculated_quantity', 24, 6);
            $table->unsignedBigInteger('raw_unit_price_rial');
            $table->boolean('trade_adjustment_enabled');
            $table->decimal('trade_adjustment_percent', 7, 4);
            $table->unsignedBigInteger('adjustment_amount_per_unit_rial');
            $table->unsignedBigInteger('final_unit_price_rial');
            $table->unsignedBigInteger('total_amount_rial');
            $table->string('product_name');
            $table->string('product_symbol');
            $table->string('product_unit', 20);
            $table->string('status', 20)->default('pending');
            $table->text('user_note')->nullable();
            $table->text('admin_note')->nullable();
            $table->timestampTz('price_effective_at');
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestampTz('approved_at')->nullable();
            $table->foreignId('rejected_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestampTz('rejected_at')->nullable();
            $table->foreignId('completed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestampTz('completed_at')->nullable();
            $table->timestampsTz();
            $table->unique(['user_id', 'client_reference']);
            $table->index(['user_id', 'created_at']);
            $table->index(['product_id', 'created_at']);
            $table->index(['status', 'trade_type', 'created_at']);
        });

        Schema::create('purchase_request_status_histories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('purchase_request_id')->constrained()->cascadeOnDelete();
            $table->string('from_status', 20)->nullable();
            $table->string('to_status', 20);
            $table->foreignId('changed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('note')->nullable();
            $table->timestampTz('created_at')->useCurrent();
            $table->index(['purchase_request_id', 'created_at'], 'pr_status_history_request_created_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('purchase_request_status_histories');
        Schema::dropIfExists('purchase_requests');
    }
};
