<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductPriceResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return ['id' => $this->id, 'product_id' => $this->product_id, 'market_price_quote_id' => $this->market_price_quote_id, 'raw_price_rial' => (string) $this->raw_price_rial, 'pricing_mode' => $this->pricing_mode->value, 'formula_key' => $this->formula_key, 'formula_parameters' => $this->formula_parameters, 'effective_at' => $this->effective_at->utc()->toIso8601String(), 'created_at' => $this->created_at->utc()->toIso8601String()];
    }
}
