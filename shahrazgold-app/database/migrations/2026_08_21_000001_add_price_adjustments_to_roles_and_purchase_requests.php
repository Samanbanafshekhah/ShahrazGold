<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('role_product_permissions', function (Blueprint $table) {
            $table->bigInteger('buy_price_adjustment_rial')->default(0);
            $table->bigInteger('sell_price_adjustment_rial')->default(0);
        });

        Schema::table('purchase_requests', function (Blueprint $table) {
            $table->bigInteger('role_price_adjustment_rial')->default(0);
        });
    }

    public function down(): void
    {
        Schema::table('purchase_requests', function (Blueprint $table) {
            $table->dropColumn('role_price_adjustment_rial');
        });

        Schema::table('role_product_permissions', function (Blueprint $table) {
            $table->dropColumn(['buy_price_adjustment_rial', 'sell_price_adjustment_rial']);
        });
    }
};
