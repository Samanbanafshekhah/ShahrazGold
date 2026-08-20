<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class RoleResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return ['id' => $this->id, 'name' => $this->name, 'slug' => $this->slug, 'description' => $this->description, 'is_active' => $this->is_active, 'users_count' => $this->when(isset($this->users_count), $this->users_count), 'permissions' => $this->when($this->relationLoaded('products'), $this->products->map(fn ($p) => ['product_id' => $p->id, 'can_access' => (bool) $p->pivot->can_access, 'can_buy' => (bool) $p->pivot->can_buy, 'buy_price_adjustment_rial' => (string) $p->pivot->buy_price_adjustment_rial, 'sell_price_adjustment_rial' => (string) $p->pivot->sell_price_adjustment_rial])->values())];
    }
}
