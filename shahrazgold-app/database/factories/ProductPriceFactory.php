<?php

namespace Database\Factories;

use App\Enums\PricingMode;
use App\Models\Product;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class ProductPriceFactory extends Factory
{
    public function definition(): array
    {
        return [
            'product_id' => Product::factory(),
            'raw_price_rial' => (string) fake()->numberBetween(10_000_000, 900_000_000),
            'pricing_mode' => PricingMode::Manual,
            'created_by' => User::factory()->admin(),
            'effective_at' => now()->utc(),
        ];
    }
}
