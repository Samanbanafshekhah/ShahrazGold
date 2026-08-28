<?php

namespace App\Services\Pricing;

use App\Models\Product;

final class CustomerUnitPriceService
{
    public const SPECIAL_PRODUCT_ID = 3;

    public const SPECIAL_PRODUCT_DIVISOR = '4.33183';

    public function forCalculation(Product|int $product, string $priceRial): string
    {
        $productId = $product instanceof Product ? (int) $product->getKey() : $product;

        if ($productId !== self::SPECIAL_PRODUCT_ID) {
            return $priceRial;
        }

        return DecimalMath::div($priceRial, self::SPECIAL_PRODUCT_DIVISOR);
    }

    public function amount(Product|int $product, string $baseAmountRial): string
    {
        return DecimalMath::roundRial($this->forCalculation($product, $baseAmountRial));
    }

    public function divisor(Product|int $product): ?string
    {
        $productId = $product instanceof Product ? (int) $product->getKey() : $product;

        return $productId === self::SPECIAL_PRODUCT_ID
            ? self::SPECIAL_PRODUCT_DIVISOR
            : null;
    }
}
