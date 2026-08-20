<?php

namespace App\Services\Pricing\Formulas;

use App\Contracts\PriceFormulaInterface;
use App\Services\Pricing\DecimalMath;

final class Gold18FromMesghalFormula implements PriceFormulaInterface
{
    public function key(): string
    {
        return 'gold18_from_mesghal';
    }

    public function sourceCode(): string
    {
        return 'GOLD_MESGHAL_17';
    }

    public function calculate(string $sourcePriceRial): string
    {
        return DecimalMath::roundRial(DecimalMath::div($sourcePriceRial, $this->divisor()));
    }

    public function parameters(): array
    {
        return ['source_code' => $this->sourceCode(), 'divisor' => $this->divisor(), 'rounding' => 'nearest_rial'];
    }

    private function divisor(): string
    {
        return (string) config('shahrazgold.pricing.gold18_from_mesghal_divisor', '4.3318');
    }
}
