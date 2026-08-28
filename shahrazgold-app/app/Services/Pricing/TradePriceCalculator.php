<?php

namespace App\Services\Pricing;

use App\Enums\EntryMode;
use App\Enums\TradeType;
use App\Models\Product;
use App\Models\ProductPrice;
use App\Models\User;

final class TradePriceCalculator
{
    public function __construct(
        private readonly CustomerUnitPriceService $customerUnitPrices = new CustomerUnitPriceService,
    ) {}

    public function calculate(Product $product, ProductPrice $price, TradeType $tradeType, EntryMode $entryMode, ?string $quantity, ?string $amountRial, ?User $user = null): array
    {
        $raw = (string) $price->raw_price_rial;
        $percent = '0';
        $normalAdjustment = $tradeType === TradeType::CustomerSell
            ? (string) $product->sell_price_difference_rial
            : '0';
        $roleAdjustments = $user?->priceAdjustmentsFor($product->id) ?? ['buy' => '0', 'sell' => '0'];
        $roleAdjustment = $tradeType === TradeType::CustomerSell
            ? $roleAdjustments['sell']
            : $roleAdjustments['buy'];

        abort_if(
            $tradeType === TradeType::CustomerSell && bccomp($raw, $normalAdjustment, 0) <= 0,
            409,
            'SELL_PRICE_UNAVAILABLE',
        );

        $normal = $tradeType === TradeType::CustomerSell
            ? DecimalMath::sub($raw, $normalAdjustment, 0)
            : $raw;
        $final = DecimalMath::add($normal, $roleAdjustment, 0);

        abort_if(bccomp($final, '0', 0) <= 0, 409, 'ROLE_PRICE_UNAVAILABLE');

        $calculationUnitPrice = $this->customerUnitPrices->forCalculation($product, $final);

        if ($entryMode === EntryMode::Quantity) {
            $calculatedQuantity = DecimalMath::quantity((string) $quantity);
            $baseTotal = DecimalMath::mul($final, $calculatedQuantity);
            $total = $this->customerUnitPrices->amount($product, $baseTotal);
        } else {
            $total = (string) $amountRial;
            $calculatedQuantity = DecimalMath::quantity(DecimalMath::div($total, $calculationUnitPrice));
        }

        return [
            'product_price_id' => $price->id,
            'raw_unit_price_rial' => $raw,
            'adjustment_percent' => $percent,
            'adjustment_amount_rial' => $normalAdjustment,
            'role_price_adjustment_rial' => $roleAdjustment,
            'final_unit_price_rial' => $final,
            'calculation_unit_price_rial' => DecimalMath::roundRial($calculationUnitPrice),
            'quantity' => $calculatedQuantity,
            'total_amount_rial' => $total,
            'price_effective_at' => $price->effective_at->utc()->toIso8601String(),
        ];
    }
}
