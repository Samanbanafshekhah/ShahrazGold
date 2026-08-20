<?php

namespace App\Contracts;

interface PriceFormulaInterface
{
    public function key(): string;

    public function sourceCode(): string;

    public function calculate(string $sourcePriceRial): string;

    public function parameters(): array;
}
