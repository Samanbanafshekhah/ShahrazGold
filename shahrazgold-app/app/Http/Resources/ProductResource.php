<?php

namespace App\Http\Resources;

use App\Services\Pricing\CustomerUnitPriceService;
use App\Services\Pricing\DecimalMath;
use App\Services\Pricing\ProductFinalAmountService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $price = $this->relationLoaded('currentPrice') ? $this->currentPrice : null;
        $rawPrice = $price ? (string) $price->raw_price_rial : null;
        $normalSellPrice = $rawPrice
            ? DecimalMath::sub($rawPrice, (string) $this->sell_price_difference_rial, 0)
            : null;
        $roleAdjustments = $request->user()?->priceAdjustmentsFor($this->id) ?? ['buy' => '0', 'sell' => '0'];
        $roleProduct = $request->user()?->accessRole?->products?->firstWhere('id', $this->id);
        $customerUnitPrices = app(CustomerUnitPriceService::class);
        $productFinalAmounts = app(ProductFinalAmountService::class);
        $buyPrice = $rawPrice ? DecimalMath::add($rawPrice, $roleAdjustments['buy'], 0) : null;
        $sellPrice = $normalSellPrice ? DecimalMath::add($normalSellPrice, $roleAdjustments['sell'], 0) : null;

        return [
            'id' => $this->id, 'name' => $this->name, 'slug' => $this->slug, 'symbol' => $this->symbol, 'description' => $this->description, 'icon' => $this->icon,
            'image_url' => $this->image_path ? url('storage/'.$this->image_path) : null, 'unit' => $this->unit->value, 'pricing_mode' => $this->pricing_mode->value,
            'category' => $this->relationLoaded('category') ? ['id' => $this->category->id, 'title' => $this->category->title, 'slug' => $this->category->slug] : null,
            'current_price' => $price ? ['id' => $price->id, 'raw_price_rial' => $rawPrice, 'buy_price_rial' => $buyPrice, 'sell_price_rial' => $sellPrice, 'effective_at' => $price->effective_at->utc()->toIso8601String()] : null,
            'is_price_available' => (bool) $price, 'is_buyable' => $this->is_buyable, 'buy_disabled' => (bool) $this->buy_disabled, 'is_sellable' => $this->is_sellable, 'sell_disabled' => (bool) $this->sell_disabled, 'is_active' => $this->is_active,
            'sell_price_difference_rial' => (string) $this->sell_price_difference_rial,
            'trade_amount_divisor' => $customerUnitPrices->divisor($this->resource),
            'final_amount_multiplier' => $productFinalAmounts->multiplier($this->resource),
            'price_version' => (int) $this->price_version,
            'price_adjustment_version' => (int) ($roleProduct?->pivot?->price_version ?? 0),
            'price_source_id' => $this->when($request->user()?->isAdmin(), $this->price_source_id),
            'pricing_formula_key' => $this->when($request->user()?->isAdmin(), $this->pricing_formula_key),
            'price_step_rial' => $this->when($request->user()?->isAdmin(), (string) $this->price_step_rial),
            'trade_adjustment_enabled' => $this->when($request->user()?->isAdmin(), $this->trade_adjustment_enabled),
            'trade_adjustment_percent' => $this->when($request->user()?->isAdmin(), (string) $this->trade_adjustment_percent),
        ];
    }
}
