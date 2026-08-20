<?php

namespace App\Services\Pricing;

final class DecimalMath
{
    public static function add(string $left, string $right, ?int $scale = null): string
    {
        return bcadd($left, $right, $scale ?? self::scale());
    }

    public static function sub(string $left, string $right, ?int $scale = null): string
    {
        return bcsub($left, $right, $scale ?? self::scale());
    }

    public static function mul(string $left, string $right, ?int $scale = null): string
    {
        return bcmul($left, $right, $scale ?? self::scale());
    }

    public static function div(string $left, string $right, ?int $scale = null): string
    {
        if (bccomp($right, '0', $scale ?? self::scale()) === 0) {
            throw new \DivisionByZeroError;
        }

        return bcdiv($left, $right, $scale ?? self::scale());
    }

    public static function roundRial(string $value): string
    {
        if (str_starts_with($value, '-')) {
            return bcsub($value, '0.5', 0);
        }

        return bcadd($value, '0.5', 0);
    }

    public static function quantity(string $value): string
    {
        $scale = (int) config('shahrazgold.pricing.quantity_scale', 6);
        $normalized = bcadd($value, '0', $scale);

        return rtrim(rtrim($normalized, '0'), '.') ?: '0';
    }

    private static function scale(): int
    {
        return (int) config('shahrazgold.pricing.calculation_scale', 12);
    }
}
