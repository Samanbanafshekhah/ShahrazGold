<?php

namespace App\Enums;

enum PricingMode: string
{
    case Manual = 'manual';
    case Derived = 'derived';
}
