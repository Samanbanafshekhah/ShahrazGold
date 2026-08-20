<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $price = $this->relationLoaded('currentPrice') ? $this->currentPrice : null;

        return [
            'id' => $this->id, 'name' => $this->name, 'slug' => $this->slug, 'symbol' => $this->symbol, 'description' => $this->description, 'icon' => $this->icon,
            'image_url' => $this->image_path ? url('storage/'.$this->image_path) : null, 'unit' => $this->unit->value, 'pricing_mode' => $this->pricing_mode->value,
            'category' => $this->relationLoaded('category') ? ['id' => $this->category->id, 'title' => $this->category->title, 'slug' => $this->category->slug] : null,
            'current_price' => $price ? ['id' => $price->id, 'raw_price_rial' => (string) $price->raw_price_rial, 'effective_at' => $price->effective_at->utc()->toIso8601String()] : null,
            'is_price_available' => (bool) $price, 'is_buyable' => $this->is_buyable, 'is_sellable' => $this->is_sellable, 'is_active' => $this->is_active,
            'sell_price_difference_rial' => (string) $this->sell_price_difference_rial,
            'price_source_id' => $this->when($request->user()?->isAdmin(), $this->price_source_id),
            'pricing_formula_key' => $this->when($request->user()?->isAdmin(), $this->pricing_formula_key),
            'price_step_rial' => $this->when($request->user()?->isAdmin(), (string) $this->price_step_rial),
            'trade_adjustment_enabled' => $this->when($request->user()?->isAdmin(), $this->trade_adjustment_enabled),
            'trade_adjustment_percent' => $this->when($request->user()?->isAdmin(), (string) $this->trade_adjustment_percent),
        ];
    }
}
