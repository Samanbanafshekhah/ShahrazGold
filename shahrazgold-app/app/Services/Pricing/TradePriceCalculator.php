<?php

namespace App\Services\Pricing;

use App\Enums\EntryMode;
use App\Enums\TradeType;
use App\Models\Product;
use App\Models\ProductPrice;

final class TradePriceCalculator
{
    public function calculate(Product $product, ProductPrice $price, TradeType $tradeType, EntryMode $entryMode, ?string $quantity, ?string $amountRial): array
    {
        $raw = (string) $price->raw_price_rial;
        $percent = '0';
        $adjustment = $tradeType === TradeType::CustomerSell
            ? (string) $product->sell_price_difference_rial
            : '0';

        abort_if(
            $tradeType === TradeType::CustomerSell && bccomp($raw, $adjustment, 0) <= 0,
            409,
            'SELL_PRICE_UNAVAILABLE',
        );

        $final = $tradeType === TradeType::CustomerSell
            ? DecimalMath::sub($raw, $adjustment, 0)
            : $raw;

        if ($entryMode === EntryMode::Quantity) {
            $calculatedQuantity = DecimalMath::quantity((string) $quantity);
            $total = DecimalMath::roundRial(DecimalMath::mul($final, $calculatedQuantity));
        } else {
            $total = (string) $amountRial;
            $calculatedQuantity = DecimalMath::quantity(DecimalMath::div($total, $final));
        }

        return [
            'product_price_id' => $price->id,
            'raw_unit_price_rial' => $raw,
            'adjustment_percent' => $percent,
            'adjustment_amount_rial' => $adjustment,
            'final_unit_price_rial' => $final,
            'quantity' => $calculatedQuantity,
            'total_amount_rial' => $total,
            'price_effective_at' => $price->effective_at->utc()->toIso8601String(),
        ];
    }
}
