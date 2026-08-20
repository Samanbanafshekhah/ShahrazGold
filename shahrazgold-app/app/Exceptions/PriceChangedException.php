<?php

namespace App\Exceptions;

use RuntimeException;

class PriceChangedException extends RuntimeException
{
    public function __construct(public array $preview)
    {
        parent::__construct('PRICE_CHANGED');
    }
}
