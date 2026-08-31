<?php

namespace Database\Factories;

use App\Enums\PricingMode;
use App\Enums\ProductUnit;
use App\Models\ProductCategory;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class ProductFactory extends Factory
{
    public function definition(): array
    {
        $name = fake()->unique()->words(2, true);

        return ['product_category_id' => ProductCategory::factory(), 'name' => $name, 'slug' => Str::slug($name).'-'.fake()->unique()->numberBetween(1, 99999), 'symbol' => strtoupper(fake()->unique()->lexify('???')).fake()->numberBetween(1, 999), 'unit' => ProductUnit::Gram, 'pricing_mode' => PricingMode::Manual, 'is_active' => true, 'is_buyable' => true, 'buy_disabled' => false, 'is_sellable' => true, 'sell_disabled' => false, 'display_order' => 0, 'trade_adjustment_enabled' => false, 'trade_adjustment_percent' => '0'];
    }
}
