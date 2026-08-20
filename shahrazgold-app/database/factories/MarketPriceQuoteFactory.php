<?php

namespace Database\Factories;

use App\Models\MarketPriceSource;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class MarketPriceQuoteFactory extends Factory
{
    public function definition(): array
    {
        return [
            'market_price_source_id' => MarketPriceSource::factory(),
            'price_rial' => (string) fake()->numberBetween(100_000_000, 900_000_000),
            'created_by' => User::factory()->admin(),
            'effective_at' => now()->utc(),
        ];
    }
}
