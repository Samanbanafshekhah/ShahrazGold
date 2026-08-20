<?php

namespace App\Services\Pricing;

use App\Contracts\PriceFormulaInterface;
use App\Services\Pricing\Formulas\Gold18FromMesghalFormula;
use InvalidArgumentException;

final class PriceFormulaRegistry
{
    /** @var array<string, PriceFormulaInterface> */
    private array $formulas;

    public function __construct(Gold18FromMesghalFormula $gold18)
    {
        $this->formulas = [$gold18->key() => $gold18];
    }

    public function get(?string $key): PriceFormulaInterface
    {
        return $this->formulas[$key] ?? throw new InvalidArgumentException("Unknown pricing formula [{$key}].");
    }
}
