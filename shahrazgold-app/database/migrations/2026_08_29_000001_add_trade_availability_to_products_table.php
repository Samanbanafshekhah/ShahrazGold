<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->boolean('buy_disabled')->default(false)->after('is_buyable');
            $table->boolean('sell_disabled')->default(false)->after('is_sellable');
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn(['buy_disabled', 'sell_disabled']);
        });
    }
};
