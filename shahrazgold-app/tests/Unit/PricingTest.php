<?php

namespace Tests\Unit;

use App\Enums\EntryMode;
use App\Enums\PricingMode;
use App\Enums\ProductUnit;
use App\Enums\TradeType;
use App\Models\Product;
use App\Models\ProductPrice;
use App\Services\Pricing\Formulas\Gold18FromMesghalFormula;
use App\Services\Pricing\TradePriceCalculator;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class PricingTest extends TestCase
{
    #[Test]
    public function gold_formula_uses_configured_decimal_divisor_and_nearest_rial(): void
    {
        config(['shahrazgold.pricing.gold18_from_mesghal_divisor' => '4.3318']);
        $formula = new Gold18FromMesghalFormula;
        $this->assertSame('69255275', $formula->calculate('300000000'));
        $this->assertSame('4.3318', $formula->parameters()['divisor']);
    }

    #[Test]
    public function trade_calculator_subtracts_the_latest_fixed_difference_from_sell_price(): void
    {
        $product = new Product(['unit' => ProductUnit::Gram, 'pricing_mode' => PricingMode::Manual, 'sell_price_difference_rial' => 1_000_000]);
        $price = new ProductPrice(['raw_price_rial' => '100000000', 'pricing_mode' => PricingMode::Manual, 'effective_at' => now()]);
        $calc = new TradePriceCalculator;
        $buy = $calc->calculate($product, $price, TradeType::CustomerBuy, EntryMode::Quantity, '1.25', null);
        $sell = $calc->calculate($product, $price, TradeType::CustomerSell, EntryMode::Amount, null, '198000000');
        $this->assertSame('100000000', $buy['final_unit_price_rial']);
        $this->assertSame('125000000', $buy['total_amount_rial']);
        $this->assertSame('99000000', $sell['final_unit_price_rial']);
        $this->assertSame('2', $sell['quantity']);

        $product->sell_price_difference_rial = 3_000_000;
        $updatedSell = $calc->calculate($product, $price, TradeType::CustomerSell, EntryMode::Quantity, '2', null);
        $this->assertSame('97000000', $updatedSell['final_unit_price_rial']);
        $this->assertSame('194000000', $updatedSell['total_amount_rial']);

        foreach ([$buy['final_unit_price_rial'], $buy['quantity'], $buy['total_amount_rial']] as $value) {
            $this->assertIsString($value);
        }
    }
}
