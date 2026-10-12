<?php

namespace App\Console\Commands;

use App\Exceptions\HomeGoldException;
use App\Services\HomeGoldPricingService;
use Illuminate\Console\Command;

class HomeGoldSync extends Command
{
    protected $signature = 'homegold:sync {--due : Only synchronize automatic bindings whose interval has elapsed}';

    protected $description = 'Refresh HomeGold quotes and synchronize automatic product prices';

    public function handle(HomeGoldPricingService $service): int
    {
        try {
            $results = $service->refresh(dueOnly: (bool) $this->option('due'));
            $this->info('Processed '.count($results).' product bindings.');
            foreach ($results as $result) {
                if (isset($result['error'])) {
                    $this->error('Product '.$result['product_id'].': '.$result['error']);
                }
            }

            return collect($results)->contains(fn ($result) => isset($result['error'])) ? self::FAILURE : self::SUCCESS;
        } catch (HomeGoldException $exception) {
            $this->error($exception->getMessage());

            return self::FAILURE;
        }
    }
}
