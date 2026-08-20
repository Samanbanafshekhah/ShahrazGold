<?php

namespace Database\Factories;

use App\Enums\AnnouncementStatus;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class MarketAnnouncementFactory extends Factory
{
    public function definition(): array
    {
        return ['title' => fake()->sentence(3), 'body' => fake()->paragraph(), 'status' => AnnouncementStatus::Draft, 'created_by' => User::factory()->admin(), 'updated_by' => User::factory()->admin()];
    }
}
