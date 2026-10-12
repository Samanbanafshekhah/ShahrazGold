<?php

namespace App\Console\Commands;

use App\Exceptions\HomeGoldException;
use App\Services\HomeGoldService;
use Illuminate\Console\Command;

class HomeGoldCommodities extends Command
{
    protected $signature = 'homegold:commodities {--json : Print the normalized JSON list} {--fresh-token : Authenticate again}';

    protected $description = 'Fetch current commodities and buy/sell prices from HomeGold';

    public function handle(HomeGoldService $service): int
    {
        try {
            if ($this->option('fresh-token')) {
                $service->forgetToken();
            }
            $products = $service->commodities();
        } catch (HomeGoldException $exception) {
            $this->error($exception->getMessage());

            return self::FAILURE;
        }

        if ($this->option('json')) {
            $this->line(json_encode($products, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT | JSON_THROW_ON_ERROR));
        } else {
            $this->table(['CommodityId', 'Name', 'buyPrice', 'sellPrice'], array_map(fn (array $product) => [
                $product['CommodityId'], $product['name'], $product['buyPrice'], $product['sellPrice'],
            ], $products));
        }

        return self::SUCCESS;
    }
}
