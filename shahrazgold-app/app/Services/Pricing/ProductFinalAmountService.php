<?php

namespace App\Services\Pricing;

use App\Enums\TradeType;
use App\Models\Product;

final class ProductFinalAmountService
{
    public const SURCHARGE_PRODUCT_ID = 1;

    public const BUY_MULTIPLIER = '1.01';

    public const SELL_MULTIPLIER = '0.99';

    public const BUY_PERCENT = '1.0000';

    public const SELL_PERCENT = '-1.0000';

    public function apply(Product|int $product, string $calculatedAmountRial, TradeType $tradeType = TradeType::CustomerBuy): string
    {
        return DecimalMath::roundRial(
            DecimalMath::mul($calculatedAmountRial, $this->multiplier($product, $tradeType)),
        );
    }

    public function multiplier(Product|int $product, TradeType $tradeType = TradeType::CustomerBuy): string
    {
        if (! $this->appliesTo($product)) {
            return '1';
        }

        return $tradeType === TradeType::CustomerSell
            ? self::SELL_MULTIPLIER
            : self::BUY_MULTIPLIER;
    }

    public function percent(Product|int $product, TradeType $tradeType = TradeType::CustomerBuy): string
    {
        if (! $this->appliesTo($product)) {
            return '0';
        }

        return $tradeType === TradeType::CustomerSell
            ? self::SELL_PERCENT
            : self::BUY_PERCENT;
    }

    private function appliesTo(Product|int $product): bool
    {
        $productId = $product instanceof Product ? (int) $product->getKey() : $product;

        return $productId === self::SURCHARGE_PRODUCT_ID;
    }
}
