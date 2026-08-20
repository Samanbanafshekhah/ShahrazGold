<?php

namespace Tests;

use App\Enums\PricingMode;
use App\Enums\ProductUnit;
use App\Models\MarketPriceSource;
use App\Models\Product;
use App\Models\ProductCategory;
use App\Models\User;

trait CreatesDomain
{
    protected function admin(array $attributes = []): User
    {
        return User::factory()->admin()->create($attributes);
    }

    protected function customer(array $attributes = []): User
    {
        return User::factory()->create($attributes);
    }

    protected function category(array $attributes = []): ProductCategory
    {
        return ProductCategory::factory()->create($attributes);
    }

    protected function source(array $attributes = []): MarketPriceSource
    {
        return MarketPriceSource::create(array_merge(['code' => 'GOLD_MESGHAL_17', 'title' => 'مظنه طلای ۱۷ عیار', 'unit' => ProductUnit::Mithqal, 'is_active' => true], $attributes));
    }

    protected function product(array $attributes = []): Product
    {
        return Product::factory()->create(array_merge(['product_category_id' => $this->category()->id], $attributes));
    }

    protected function derivedProduct(?MarketPriceSource $source = null, array $attributes = []): Product
    {
        $source ??= $this->source();

        return $this->product(array_merge(['name' => 'طلای ۱۸ عیار', 'slug' => 'gold-18', 'symbol' => 'GOLD18', 'pricing_mode' => PricingMode::Derived, 'price_source_id' => $source->id, 'pricing_formula_key' => 'gold18_from_mesghal', 'trade_adjustment_enabled' => true, 'trade_adjustment_percent' => '1.0000'], $attributes));
    }
}
