<?php

namespace Database\Factories;

use App\Enums\ProductUnit;
use Illuminate\Database\Eloquent\Factories\Factory;

class MarketPriceSourceFactory extends Factory
{
    public function definition(): array
    {
        return [
            'code' => 'SOURCE_'.fake()->unique()->numerify('#####'),
            'title' => fake()->words(3, true),
            'unit' => ProductUnit::Mithqal,
            'is_active' => true,
        ];
    }
}
