<?php

namespace App\Enums;

enum TradeType: string
{
    case CustomerBuy = 'customer_buy';
    case CustomerSell = 'customer_sell';
}
