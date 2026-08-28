<?php

namespace App\Services\Pricing;

use App\Enums\PricingMode;
use App\Events\PriceUpdated;
use App\Models\MarketPriceQuote;
use App\Models\MarketPriceSource;
use App\Models\Product;
use App\Models\ProductPrice;
use App\Services\AuditService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

final class ProductPricingService
{
    public function __construct(private PriceFormulaRegistry $registry, private AuditService $audit) {}

    public function createQuote(MarketPriceSource $source, string $priceRial, ?string $note, int $actorId): MarketPriceQuote
    {
        return DB::transaction(function () use ($source, $priceRial, $note, $actorId) {
            $locked = MarketPriceSource::query()->lockForUpdate()->findOrFail($source->id);
            abort_unless($locked->is_active, 409, 'Price source is inactive.');
            $effectiveAt = now()->utc();
            $quote = $locked->quotes()->create([
                'price_rial' => $priceRial, 'note' => $note, 'created_by' => $actorId, 'effective_at' => $effectiveAt,
            ]);

            Product::query()->where('price_source_id', $locked->id)->where('pricing_mode', PricingMode::Derived->value)
                ->where('is_active', true)->lockForUpdate()->get()->each(function (Product $product) use ($quote, $actorId, $effectiveAt, $locked) {
                    $formula = $this->registry->get($product->pricing_formula_key);
                    $parameters = $formula->parameters();
                    $parameters['source_code'] = $locked->code;
                    $productPrice = $product->prices()->create([
                        'market_price_quote_id' => $quote->id,
                        'raw_price_rial' => $formula->calculate((string) $quote->price_rial),
                        'pricing_mode' => PricingMode::Derived,
                        'formula_key' => $formula->key(),
                        'formula_parameters' => $parameters,
                        'created_by' => $actorId,
                        'effective_at' => $effectiveAt,
                    ]);
                    $product->increment('price_version');
                    DB::afterCommit(fn () => Log::channel('realtime')->info('price.changed', [
                        'product_id' => $product->id,
                        'price_id' => $productPrice->id,
                        'source' => 'market_quote',
                        'timestamp' => $effectiveAt->toISOString(),
                    ]));
                    PriceUpdated::dispatch($productPrice);
                });

            $this->audit->record('market_quote.created', $quote, null, $quote->toArray(), $actorId);

            return $quote;
        }, 3);
    }

    public function createManualPrice(Product $product, string $priceRial, int $actorId): ProductPrice
    {
        abort_unless($product->pricing_mode === PricingMode::Manual, 409, 'Manual price is only allowed for manual products.');

        return DB::transaction(function () use ($product, $priceRial, $actorId) {
            $locked = Product::query()->lockForUpdate()->findOrFail($product->id);
            $price = $locked->prices()->create([
                'raw_price_rial' => $priceRial, 'pricing_mode' => PricingMode::Manual,
                'created_by' => $actorId, 'effective_at' => now()->utc(),
            ]);
            $locked->increment('price_version');
            $this->audit->record('product_price.created', $price, null, $price->toArray(), $actorId);
            DB::afterCommit(fn () => Log::channel('realtime')->info('price.changed', [
                'product_id' => $locked->id,
                'price_id' => $price->id,
                'source' => 'manual',
                'timestamp' => $price->effective_at->utc()->toISOString(),
            ]));
            PriceUpdated::dispatch($price);

            return $price;
        }, 3);
    }
}
