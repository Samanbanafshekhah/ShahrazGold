<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->unsignedBigInteger('price_version')->default(0);
        });

        Schema::table('role_product_permissions', function (Blueprint $table) {
            $table->unsignedBigInteger('price_version')->default(0);
        });
    }

    public function down(): void
    {
        Schema::table('role_product_permissions', fn (Blueprint $table) => $table->dropColumn('price_version'));
        Schema::table('products', fn (Blueprint $table) => $table->dropColumn('price_version'));
    }
};
