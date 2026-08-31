<?php

namespace Tests\Unit;

use App\Enums\TradeType;
use App\Models\Product;
use App\Services\TradeAvailabilityService;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class TradeAvailabilityTest extends TestCase
{
    #[Test]
    public function buy_and_sell_can_be_closed_independently(): void
    {
        $service = new TradeAvailabilityService;
        $product = new Product(['buy_disabled' => false, 'sell_disabled' => false]);

        $this->assertNull($service->closedMessage($product, TradeType::CustomerBuy));
        $this->assertNull($service->closedMessage($product, TradeType::CustomerSell));

        $product->buy_disabled = true;
        $this->assertSame(
            'خرید این محصول در حال حاضر بسته است.',
            $service->closedMessage($product, TradeType::CustomerBuy),
        );
        $this->assertNull($service->closedMessage($product, TradeType::CustomerSell));

        $product->buy_disabled = false;
        $product->sell_disabled = true;
        $this->assertNull($service->closedMessage($product, TradeType::CustomerBuy));
        $this->assertSame(
            'فروش این محصول در حال حاضر بسته است.',
            $service->closedMessage($product, TradeType::CustomerSell),
        );

        $product->buy_disabled = true;
        $this->assertNotNull($service->closedMessage($product, TradeType::CustomerBuy));
        $this->assertNotNull($service->closedMessage($product, TradeType::CustomerSell));
    }
}
