<?php

namespace App\Services;

use App\Enums\PricingMode;
use App\Events\PriceUpdated;
use App\Exceptions\HomeGoldException;
use App\Models\HomeGoldBinding;
use App\Models\Product;
use App\Services\Pricing\DecimalMath;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class HomeGoldPricingService
{
    public function __construct(private HomeGoldService $api, private AuditService $audit) {}

    public function feed(): ?array
    {
        return Cache::store(config('services.homegold.cache_store', 'file'))->get('homegold:commodity-feed');
    }

    public function fetch(): array
    {
        $feed = ['commodities' => $this->api->commodities(), 'fetched_at' => now()->utc()->toISOString()];
        Cache::store(config('services.homegold.cache_store', 'file'))->put('homegold:commodity-feed', $feed, 86400);

        return $feed;
    }

    public function preview(array $settings, array $feed): array
    {
        $settings = array_replace($settings, HomeGoldBinding::FIXED_SETTINGS);
        $quote = collect($feed['commodities'])->firstWhere('CommodityId', $settings['commodity_id']);
        if (! $quote) {
            throw new HomeGoldException('محصول انتخاب‌شده در پاسخ هوم‌گلد وجود ندارد.');
        }
        $prices = [];
        foreach (['buy', 'sell'] as $side) {
            $source = (string) $quote[$settings[$side.'_field']];
            if (bccomp($source, '0', 6) <= 0) {
                throw new HomeGoldException('قیمت دریافتی باید بیشتر از صفر باشد.');
            }
            $converted = DecimalMath::div(DecimalMath::mul($source, (string) $settings['currency_multiplier']), (string) $settings['unit_divisor']);
            $factor = DecimalMath::add('1', DecimalMath::div((string) $settings[$side.'_percent'], '100'));
            $prices[$side.'_price_rial'] = DecimalMath::roundRial(DecimalMath::add(
                DecimalMath::mul($converted, $factor), (string) $settings[$side.'_offset_rial'],
            ));
            if (bccomp($prices[$side.'_price_rial'], '0', 0) <= 0 || bccomp($prices[$side.'_price_rial'], '9000000000000000', 0) > 0) {
                throw new HomeGoldException('قیمت نهایی خارج از محدودهٔ مجاز است.');
            }
        }

        return $prices + ['quote' => $quote, 'fetched_at' => $feed['fetched_at']];
    }

    /** Fetch once, then synchronize automatic bindings. */
    public function refresh(?int $productId = null, bool $dueOnly = false): array
    {
        $store = Cache::store(config('services.homegold.cache_store', 'file'));
        $lock = $store->lock('homegold:price-sync', 90);
        if (! $lock->get()) {
            throw new HomeGoldException('دریافت قیمت در حال انجام است؛ کمی بعد دوباره تلاش کنید.');
        }
        try {
            $bindings = HomeGoldBinding::with('product')->whereHas('product', fn ($q) => $q->where('is_active', true))
                ->where('mode', 'auto')
                ->when($productId !== null, fn ($q) => $q->where('product_id', $productId))->get();
            if ($dueOnly) {
                $bindings = $bindings->filter(fn ($b) => $b->mode === 'auto'
                    && (! $b->last_attempt_at || $b->last_attempt_at->addSeconds(HomeGoldBinding::INTERVAL_SECONDS)->lte(now())));
                if ($bindings->isEmpty()) {
                    return [];
                }
            }
            $attempt = now()->utc();
            try {
                $feed = $this->fetch();
            } catch (HomeGoldException $exception) {
                foreach ($bindings as $binding) {
                    $binding->update(['last_attempt_at' => $attempt, 'last_error' => 'دریافت قیمت از هوم‌گلد ناموفق بود.']);
                }
                throw $exception;
            }
            $results = [];
            foreach ($bindings as $binding) {
                try {
                    $results[] = $this->synchronize($binding, $feed, $attempt);
                } catch (HomeGoldException $exception) {
                    $binding->update(['last_attempt_at' => $attempt, 'last_error' => $exception->getMessage()]);
                    $results[] = ['product_id' => $binding->product_id, 'error' => $exception->getMessage()];
                }
            }

            return $results;
        } finally {
            $lock->release();
        }
    }

    private function synchronize(HomeGoldBinding $binding, array $feed, mixed $attempt): array
    {
        return DB::transaction(function () use ($binding, $feed, $attempt) {
            $product = Product::lockForUpdate()->find($binding->product_id);
            $locked = HomeGoldBinding::lockForUpdate()->find($binding->id);
            if (! $product || ! $product->is_active || ! $locked || $locked->mode !== 'auto') {
                return ['product_id' => $binding->product_id, 'changed' => false];
            }
            $preview = $this->preview($locked->toArray(), $feed);
            $changed = false;
            if ($locked->mode === 'auto') {
                if ($product->pricing_mode !== PricingMode::Manual) {
                    throw new HomeGoldException('برای اتصال خودکار، روش قیمت‌گذاری محصول باید دستی باشد.');
                }
                $previous = $product->currentPrice()->first();
                $oldSell = $previous ? DecimalMath::sub((string) $previous->raw_price_rial, $product->sellDifferenceFor($previous), 0) : null;
                if (! $previous || $previous->formula_key !== 'homegold_external'
                    || bccomp((string) $previous->raw_price_rial, $preview['buy_price_rial'], 0) !== 0
                    || bccomp((string) $oldSell, $preview['sell_price_rial'], 0) !== 0) {
                    $price = $product->prices()->create([
                        'raw_price_rial' => $preview['buy_price_rial'],
                        'pricing_mode' => PricingMode::Manual, 'formula_key' => 'homegold_external',
                        'formula_parameters' => ['sell_price_rial' => $preview['sell_price_rial'], 'quote' => $preview['quote'], 'settings' => array_replace($locked->only([
                            'commodity_id', 'buy_field', 'sell_field', 'currency_multiplier', 'unit_divisor',
                            'buy_percent', 'sell_percent', 'buy_offset_rial', 'sell_offset_rial',
                        ]), HomeGoldBinding::FIXED_SETTINGS)],
                        'created_by' => $locked->updated_by, 'effective_at' => $attempt,
                    ]);
                    $product->increment('price_version');
                    $product->unsetRelation('currentPrice');
                    $this->audit->record('homegold.price_applied', $price, null, $price->toArray(), $locked->updated_by);
                    PriceUpdated::dispatch($price);
                    $changed = true;
                }
            }
            $locked->update(['last_attempt_at' => $attempt, 'last_success_at' => $attempt,
                'last_error' => null, 'last_quote' => $preview]);

            return ['product_id' => $product->id, 'changed' => $changed, 'preview' => $preview];
        }, 3);
    }
}
