<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('product_categories', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->string('slug')->unique();
            $table->text('description')->nullable();
            $table->string('icon')->nullable();
            $table->string('image_path')->nullable();
            $table->boolean('is_active')->default(true);
            $table->unsignedInteger('display_order')->default(0);
            $table->timestampsTz();
            $table->softDeletesTz();
            $table->index(['is_active', 'display_order']);
        });

        Schema::create('market_price_sources', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique();
            $table->string('title');
            $table->string('unit', 20);
            $table->boolean('is_active')->default(true);
            $table->timestampsTz();
        });

        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_category_id')->constrained()->restrictOnDelete();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('symbol')->unique();
            $table->text('description')->nullable();
            $table->string('icon')->nullable();
            $table->string('image_path')->nullable();
            $table->string('unit', 20);
            $table->string('pricing_mode', 20);
            $table->foreignId('price_source_id')->nullable()->constrained('market_price_sources')->restrictOnDelete();
            $table->string('pricing_formula_key')->nullable();
            $table->boolean('is_active')->default(true);
            $table->boolean('is_buyable')->default(true);
            $table->boolean('is_sellable')->default(true);
            $table->unsignedInteger('display_order')->default(0);
            $table->boolean('trade_adjustment_enabled')->default(false);
            $table->decimal('trade_adjustment_percent', 7, 4)->default(0);
            $table->timestampsTz();
            $table->softDeletesTz();
            $table->index(['product_category_id', 'is_active']);
            $table->index(['pricing_mode', 'price_source_id']);
            $table->index(['is_active', 'is_buyable', 'is_sellable']);
        });

        Schema::create('market_price_quotes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('market_price_source_id')->constrained()->restrictOnDelete();
            $table->unsignedBigInteger('price_rial');
            $table->text('note')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestampTz('effective_at');
            $table->timestampTz('created_at')->useCurrent();
            $table->index(['market_price_source_id', 'effective_at', 'id']);
        });

        Schema::create('product_prices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained()->restrictOnDelete();
            $table->foreignId('market_price_quote_id')->nullable()->constrained()->restrictOnDelete();
            $table->unsignedBigInteger('raw_price_rial');
            $table->string('pricing_mode', 20);
            $table->string('formula_key')->nullable();
            $table->jsonb('formula_parameters')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestampTz('effective_at');
            $table->timestampTz('created_at')->useCurrent();
            $table->index(['product_id', 'effective_at', 'id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_prices');
        Schema::dropIfExists('market_price_quotes');
        Schema::dropIfExists('products');
        Schema::dropIfExists('market_price_sources');
        Schema::dropIfExists('product_categories');
    }
};
