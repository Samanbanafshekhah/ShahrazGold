<?php

namespace App\Services\Pricing;

use App\Models\Product;

final class ProductFinalAmountService
{
    public const SURCHARGE_PRODUCT_ID = 1;

    public const SURCHARGE_MULTIPLIER = '1.01';

    public const SURCHARGE_PERCENT = '1.0000';

    public function apply(Product|int $product, string $calculatedAmountRial): string
    {
        return DecimalMath::roundRial(
            DecimalMath::mul($calculatedAmountRial, $this->multiplier($product)),
        );
    }

    public function multiplier(Product|int $product): string
    {
        return $this->appliesTo($product) ? self::SURCHARGE_MULTIPLIER : '1';
    }

    public function percent(Product|int $product): string
    {
        return $this->appliesTo($product) ? self::SURCHARGE_PERCENT : '0';
    }

    private function appliesTo(Product|int $product): bool
    {
        $productId = $product instanceof Product ? (int) $product->getKey() : $product;

        return $productId === self::SURCHARGE_PRODUCT_ID;
    }
}
