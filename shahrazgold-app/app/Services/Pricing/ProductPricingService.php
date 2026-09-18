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
use Illuminate\Validation\ValidationException;

final class ProductPricingService
{
    private const LINKED_PRICE_SOURCE_PRODUCT_ID = 3;

    private const LINKED_PRICE_TARGET_PRODUCT_ID = 1;

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
            $productIds = [$product->id];
            if ($product->id === self::LINKED_PRICE_SOURCE_PRODUCT_ID) {
                $productIds[] = self::LINKED_PRICE_TARGET_PRODUCT_ID;
            }

            $lockedProducts = Product::query()
                ->whereIn('id', $productIds)
                ->orderBy('id')
                ->lockForUpdate()
                ->get()
                ->keyBy('id');
            $locked = $lockedProducts->get($product->id);
            abort_unless($locked, 404);

            $previousPrice = $locked->currentPrice()->first();
            $effectiveAt = now()->utc();
            $price = $this->createPriceSnapshot(
                $locked,
                $priceRial,
                $actorId,
                $effectiveAt,
                PricingMode::Manual,
                'manual',
            );

            $priceDirection = $previousPrice
                ? bccomp($priceRial, (string) $previousPrice->raw_price_rial, 0)
                : 0;

            if ($product->id === self::LINKED_PRICE_SOURCE_PRODUCT_ID && $priceDirection !== 0) {
                $linkedProduct = $lockedProducts->get(self::LINKED_PRICE_TARGET_PRODUCT_ID);
                abort_unless($linkedProduct, 409, 'Linked product 1 was not found.');

                $linkedPreviousPrice = $linkedProduct->currentPrice()->first();
                abort_unless($linkedPreviousPrice, 409, 'Linked product 1 does not have a current price.');

                $linkedStepRial = (string) max(1, (int) $linkedProduct->price_step_rial);
                $linkedPriceRial = $priceDirection > 0
                    ? DecimalMath::add((string) $linkedPreviousPrice->raw_price_rial, $linkedStepRial, 0)
                    : DecimalMath::sub((string) $linkedPreviousPrice->raw_price_rial, $linkedStepRial, 0);
                if (bccomp($linkedPriceRial, '1', 0) < 0) {
                    throw ValidationException::withMessages([
                        'raw_price_rial' => 'This change would make linked product 1 price less than one rial.',
                    ]);
                }

                $this->createPriceSnapshot(
                    $linkedProduct,
                    $linkedPriceRial,
                    $actorId,
                    $effectiveAt,
                    $linkedPreviousPrice->pricing_mode,
                    'linked_product_3',
                    $linkedPreviousPrice,
                );
            }

            return $price;
        }, 3);
    }

    private function createPriceSnapshot(
        Product $product,
        string $priceRial,
        int $actorId,
        mixed $effectiveAt,
        PricingMode $pricingMode,
        string $source,
        ?ProductPrice $previousPrice = null,
    ): ProductPrice {
        $price = $product->prices()->create([
            'market_price_quote_id' => $previousPrice?->market_price_quote_id,
            'raw_price_rial' => $priceRial,
            'pricing_mode' => $pricingMode,
            'formula_key' => $previousPrice?->formula_key,
            'formula_parameters' => $previousPrice?->formula_parameters,
            'created_by' => $actorId,
            'effective_at' => $effectiveAt,
        ]);
        $product->increment('price_version');
        $this->audit->record('product_price.created', $price, null, $price->toArray(), $actorId);
        DB::afterCommit(fn () => Log::channel('realtime')->info('price.changed', [
            'product_id' => $product->id,
            'price_id' => $price->id,
            'source' => $source,
            'timestamp' => $price->effective_at->utc()->toISOString(),
        ]));
        PriceUpdated::dispatch($price);

        return $price;
    }
}
