<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class ProductCategoryFactory extends Factory
{
    public function definition(): array
    {
        $title = fake()->unique()->words(2, true);

        return ['title' => $title, 'slug' => Str::slug($title).'-'.fake()->unique()->numberBetween(1, 99999), 'is_active' => true, 'display_order' => 0];
    }
}
