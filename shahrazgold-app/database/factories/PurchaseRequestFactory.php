<?php

namespace Database\Factories;

use App\Enums\EntryMode;
use App\Enums\PurchaseRequestStatus;
use App\Enums\TradeType;
use App\Models\Product;
use App\Models\ProductPrice;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class PurchaseRequestFactory extends Factory
{
    public function definition(): array
    {
        $product = Product::factory()->create();
        $price = ProductPrice::create(['product_id' => $product->id, 'raw_price_rial' => '10000000', 'pricing_mode' => $product->pricing_mode, 'created_by' => null, 'effective_at' => now()]);

        return ['request_number' => 'TEST-'.strtoupper(Str::random(12)), 'client_reference' => (string) Str::uuid(), 'user_id' => User::factory(), 'product_id' => $product->id, 'product_price_id' => $price->id, 'trade_type' => TradeType::CustomerBuy, 'entry_mode' => EntryMode::Quantity, 'requested_quantity' => '1', 'calculated_quantity' => '1', 'raw_unit_price_rial' => '10000000', 'trade_adjustment_enabled' => false, 'trade_adjustment_percent' => '0', 'adjustment_amount_per_unit_rial' => '0', 'final_unit_price_rial' => '10000000', 'total_amount_rial' => '10000000', 'product_name' => $product->name, 'product_symbol' => $product->symbol, 'product_unit' => $product->unit->value, 'status' => PurchaseRequestStatus::Pending, 'price_effective_at' => $price->effective_at];
    }
}
