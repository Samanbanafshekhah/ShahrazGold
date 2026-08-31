<?php

namespace App\Services;

use App\Enums\TradeType;
use App\Models\Product;

final class TradeAvailabilityService
{
    public function closedMessage(Product $product, TradeType $tradeType): ?string
    {
        return match ($tradeType) {
            TradeType::CustomerBuy => $product->buy_disabled
                ? 'خرید این محصول در حال حاضر بسته است.'
                : null,
            TradeType::CustomerSell => $product->sell_disabled
                ? 'فروش این محصول در حال حاضر بسته است.'
                : null,
        };
    }

    public function ensureOpen(Product $product, TradeType $tradeType): void
    {
        $message = $this->closedMessage($product, $tradeType);

        abort_if($message !== null, 409, $message);
    }
}
