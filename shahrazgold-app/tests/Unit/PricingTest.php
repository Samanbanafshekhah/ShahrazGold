<?php

namespace Tests\Unit;

use App\Enums\EntryMode;
use App\Enums\PricingMode;
use App\Enums\ProductUnit;
use App\Enums\TradeType;
use App\Models\Product;
use App\Models\ProductPrice;
use App\Services\Pricing\CustomerUnitPriceService;
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

    #[Test]
    public function product_one_adds_one_percent_to_final_buy_and_sell_amounts_only(): void
    {
        $target = new Product([
            'unit' => ProductUnit::Gram,
            'pricing_mode' => PricingMode::Manual,
            'sell_price_difference_rial' => 1_000_000,
        ]);
        $target->setAttribute('id', 1);
        $other = clone $target;
        $other->setAttribute('id', 2);
        $price = new ProductPrice([
            'raw_price_rial' => '10000000',
            'pricing_mode' => PricingMode::Manual,
            'effective_at' => now(),
        ]);
        $calculator = new TradePriceCalculator;

        $targetBuy = $calculator->calculate($target, $price, TradeType::CustomerBuy, EntryMode::Quantity, '1', null);
        $targetSell = $calculator->calculate($target, $price, TradeType::CustomerSell, EntryMode::Quantity, '1', null);
        $otherBuy = $calculator->calculate($other, $price, TradeType::CustomerBuy, EntryMode::Quantity, '1', null);
        $otherSell = $calculator->calculate($other, $price, TradeType::CustomerSell, EntryMode::Quantity, '1', null);

        $this->assertSame('10000000', $targetBuy['final_unit_price_rial']);
        $this->assertSame('9000000', $targetSell['final_unit_price_rial']);
        $this->assertSame('10000000', $otherBuy['final_unit_price_rial']);
        $this->assertSame('9000000', $otherSell['final_unit_price_rial']);
        $this->assertSame('10100000', $targetBuy['total_amount_rial']);
        $this->assertSame('9090000', $targetSell['total_amount_rial']);
        $this->assertSame('10000000', $otherBuy['total_amount_rial']);
        $this->assertSame('9000000', $otherSell['total_amount_rial']);
        $this->assertSame('1.0000', $targetBuy['adjustment_percent']);
        $this->assertSame('1.0000', $targetSell['adjustment_percent']);
        $this->assertSame('0', $otherBuy['adjustment_percent']);
        $this->assertSame('0', $otherSell['adjustment_percent']);
    }

    #[Test]
    public function amount_calculation_price_uses_the_exact_divisor_only_for_product_three(): void
    {
        $service = new CustomerUnitPriceService;

        $this->assertSame('9233972.708993658569', $service->forCalculation(3, '40000000'));
        $this->assertSame('9233973', $service->amount(3, '40000000'));
        $this->assertSame('40000000', $service->forCalculation(4, '40000000'));
        $this->assertSame('4.33183', $service->divisor(3));
        $this->assertNull($service->divisor(4));
        $this->assertSame('4.33183', CustomerUnitPriceService::SPECIAL_PRODUCT_DIVISOR);
    }

    #[Test]
    public function trade_calculator_keeps_unit_prices_and_converts_product_three_totals(): void
    {
        $product = new Product([
            'unit' => ProductUnit::Gram,
            'pricing_mode' => PricingMode::Manual,
            'sell_price_difference_rial' => 500_000,
        ]);
        $product->setAttribute('id', 3);
        $price = new ProductPrice([
            'raw_price_rial' => '40000000',
            'pricing_mode' => PricingMode::Manual,
            'effective_at' => now(),
        ]);
        $calculator = new TradePriceCalculator;

        $buy = $calculator->calculate($product, $price, TradeType::CustomerBuy, EntryMode::Quantity, '2', null);
        $sell = $calculator->calculate($product, $price, TradeType::CustomerSell, EntryMode::Quantity, '2', null);

        $this->assertSame('40000000', $buy['final_unit_price_rial']);
        $this->assertSame('9233973', $buy['calculation_unit_price_rial']);
        $this->assertSame('18467945', $buy['total_amount_rial']);
        $this->assertSame('39500000', $sell['final_unit_price_rial']);
        $this->assertSame('9118548', $sell['calculation_unit_price_rial']);
        $this->assertSame('18237096', $sell['total_amount_rial']);
    }
}
