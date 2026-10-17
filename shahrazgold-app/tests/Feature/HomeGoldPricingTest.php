<?php

namespace Tests\Feature;

use App\Enums\EntryMode;
use App\Enums\TradeType;
use App\Events\PriceUpdated;
use App\Exceptions\HomeGoldException;
use App\Models\HomeGoldBinding;
use App\Models\Product;
use App\Models\Role;
use App\Services\HomeGoldPricingService;
use App\Services\Pricing\ProductPricingService;
use App\Services\Pricing\TradePriceCalculator;
use App\Services\TradeAvailabilityService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Factory;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\CreatesDomain;
use Tests\TestCase;

class HomeGoldPricingTest extends TestCase
{
    use CreatesDomain, RefreshDatabase;

    private array $settings = [
        'commodity_id' => 'coin-1', 'mode' => 'disabled',
        'currency_multiplier' => 10,
    ];

    protected function setUp(): void
    {
        parent::setUp();
        config(['services.homegold' => [
            'base_url' => 'https://homegold.example', 'client_id' => 'test-client',
            'client_secret' => 'test-secret', 'cache_store' => 'array', 'token_ttl' => 300,
        ]]);
        Http::preventStrayRequests();
        Event::fake([PriceUpdated::class]);
        $this->fakeFeed();
    }

    private function fakeFeed(int $buy = 1000, int $sell = 900): void
    {
        Http::swap(new Factory);
        Http::preventStrayRequests();
        Http::fake([
            '*/ExternalPartnerAuth/token' => Http::response(['success' => true, 'data' => ['key' => 'token']]),
            '*/PartnerAPI/Ordering/ExternalPartner/commodity' => Http::response(['success' => true, 'data' => [
                ['name' => 'سکه تست', 'commodityId' => 'coin-1', 'buyPrice' => $buy, 'sellPrice' => $sell],
            ]]),
        ]);
    }

    private function binding(Product $product, string $mode = 'auto'): HomeGoldBinding
    {
        return HomeGoldBinding::create(array_merge(HomeGoldBinding::FIXED_SETTINGS, $this->settings, ['product_id' => $product->id, 'mode' => $mode]));
    }

    public function test_only_admin_can_use_management_endpoints_and_credentials_are_not_exposed(): void
    {
        $this->getJson('/api/v1/admin/homegold')->assertUnauthorized();
        Sanctum::actingAs($this->customer());
        $this->postJson('/api/v1/admin/homegold/refresh')->assertForbidden();
        Sanctum::actingAs($this->admin());
        $response = $this->getJson('/api/v1/admin/homegold')->assertOk()->assertJsonPath('data.configured', true);
        $this->assertStringNotContainsString('test-secret', $response->getContent());
        Http::assertNothingSent();
    }

    public function test_preview_and_saving_manual_mode_never_modify_product_prices(): void
    {
        $product = $this->product(['id' => 10]);
        Sanctum::actingAs($this->admin());
        $this->postJson('/api/v1/admin/homegold/products/'.$product->id.'/preview', $this->settings)
            ->assertOk()->assertJsonPath('data.buy_price_rial', '10000')->assertJsonPath('data.sell_price_rial', '9000');
        $this->putJson('/api/v1/admin/homegold/products/'.$product->id, $this->settings)->assertOk();
        $this->postJson('/api/v1/admin/homegold/refresh')->assertOk();
        $this->assertDatabaseCount('product_prices', 0);
        $this->assertSame(0, $product->fresh()->price_version);
    }

    public function test_auto_requires_successful_sync_and_writes_both_prices_with_one_version(): void
    {
        $product = $this->product(['id' => 10]);
        $binding = $this->binding($product);
        $this->assertTrue($binding->isStale());
        app(HomeGoldPricingService::class)->refresh();
        $product = $product->fresh();
        $this->assertFalse($binding->fresh()->isStale());
        $this->assertSame('10000', $product->currentPrice->raw_price_rial);
        $this->assertSame('1000', $product->sellDifferenceFor());
        $this->assertSame(1, $product->price_version);
        $calculation = app(TradePriceCalculator::class)->calculate($product, $product->currentPrice, TradeType::CustomerSell, EntryMode::Quantity, '1', null);
        $this->assertSame('9000', $calculation['final_unit_price_rial']);
        Event::assertDispatched(PriceUpdated::class, 1);
        app(HomeGoldPricingService::class)->refresh();
        $this->assertDatabaseCount('product_prices', 1);
        $this->assertSame(1, $product->fresh()->price_version);
        Event::assertDispatched(PriceUpdated::class, 1);
    }

    public function test_sell_only_changes_create_a_new_snapshot_and_broadcast_correct_difference(): void
    {
        $product = $this->product(['id' => 10]);
        $this->binding($product);
        app(HomeGoldPricingService::class)->refresh();
        $this->fakeFeed(sell: 950);
        app(HomeGoldPricingService::class)->refresh();
        $product = $product->fresh();
        $this->assertDatabaseCount('product_prices', 2);
        $this->assertSame(2, $product->price_version);
        $payload = (new PriceUpdated($product->currentPrice))->broadcastWith();
        $this->assertSame('500', $payload['sell_price_difference_rial']);
    }

    public function test_connection_failure_preserves_price_and_stale_prices_stop_trading(): void
    {
        $product = $this->product(['id' => 10]);
        $binding = $this->binding($product);
        app(HomeGoldPricingService::class)->refresh();
        $priceId = $product->fresh()->currentPrice->id;
        $this->travel(181)->seconds();
        Http::fake(['*' => Http::failedConnection()]);
        try {
            app(HomeGoldPricingService::class)->refresh();
            $this->fail('Expected provider failure.');
        } catch (HomeGoldException) {
            $this->assertNotNull($binding->fresh()->last_error);
        }
        $product = $product->fresh();
        $this->assertSame($priceId, $product->currentPrice->id);
        $this->assertNotNull(app(TradeAvailabilityService::class)->closedMessage($product, TradeType::CustomerBuy));
        $this->getJson('/api/v1/products/'.$product->slug)->assertOk()
            ->assertJsonPath('data.price_stale', true)->assertJsonPath('data.buy_disabled', true)
            ->assertJsonPath('data.sell_disabled', true)->assertJsonPath('data.is_price_available', false);
    }

    public function test_recovery_with_unchanged_price_renews_validity_without_invalidating_orders(): void
    {
        $product = $this->product(['id' => 10]);
        $binding = $this->binding($product);
        app(HomeGoldPricingService::class)->refresh();
        $this->travel(181)->seconds();
        $this->assertTrue($binding->fresh()->isStale());
        app(HomeGoldPricingService::class)->refresh();
        $this->assertFalse($binding->fresh()->isStale());
        $this->assertDatabaseCount('product_prices', 1);
    }

    public function test_missing_commodity_preserves_existing_price_and_records_error(): void
    {
        $product = $this->product(['id' => 10]);
        $binding = $this->binding($product);
        app(HomeGoldPricingService::class)->refresh();
        $binding->update(['commodity_id' => 'missing']);
        $results = app(HomeGoldPricingService::class)->refresh();
        $this->assertArrayHasKey('error', $results[0]);
        $this->assertDatabaseCount('product_prices', 1);
        $this->assertNotNull($binding->fresh()->last_error);
    }

    public function test_ten_second_interval_is_accepted_and_sync_waits_until_it_is_due(): void
    {
        $this->freezeTime();
        $product = $this->product(['id' => 10]);
        Sanctum::actingAs($this->admin());
        $settings = array_merge($this->settings, ['mode' => 'auto', 'interval_seconds' => 10]);
        $url = '/api/v1/admin/homegold/products/'.$product->id;
        $this->putJson($url, $settings)->assertOk()->assertJsonPath('data.interval_seconds', 10);
        $this->putJson($url, array_merge($settings, ['interval_seconds' => 3600]))
            ->assertOk()->assertJsonPath('data.interval_seconds', 10);
        $binding = $product->homeGoldBinding()->firstOrFail();
        $binding->update(['last_attempt_at' => now(), 'interval_seconds' => 3600]);
        Http::assertSentCount(2);
        $this->travel(9)->seconds();
        $this->assertSame([], app(HomeGoldPricingService::class)->refresh(dueOnly: true));
        Http::assertSentCount(2);
        $this->travel(1)->seconds();
        $results = app(HomeGoldPricingService::class)->refresh(dueOnly: true);
        $this->assertCount(1, $results);
        $this->assertTrue($results[0]['changed']);
        Http::assertSentCount(3);
        $this->fakeFeed(buy: 1100);
        $this->travel(10)->seconds();
        $results = app(HomeGoldPricingService::class)->refresh(dueOnly: true);
        $this->assertTrue($results[0]['changed']);
        $this->assertSame('11000', $product->fresh()->currentPrice->raw_price_rial);
    }

    public function test_due_sync_skips_network_when_no_binding_is_due(): void
    {
        $product = $this->product(['id' => 10]);
        $this->binding($product)->update(['last_attempt_at' => now()]);
        $this->assertSame([], app(HomeGoldPricingService::class)->refresh(dueOnly: true));
        Http::assertNothingSent();
    }

    public function test_existing_bindings_use_direct_prices_and_fixed_validity(): void
    {
        $this->freezeTime();
        $product = $this->product(['id' => 10]);
        $binding = $this->binding($product);
        $binding->update([
            'buy_field' => 'sellPrice', 'sell_field' => 'buyPrice', 'unit_divisor' => 1000,
            'buy_percent' => 50, 'sell_percent' => -50,
            'buy_offset_rial' => 100, 'sell_offset_rial' => -100, 'stale_after_seconds' => 20,
        ]);
        app(HomeGoldPricingService::class)->refresh();
        $price = $product->fresh()->currentPrice;
        $this->assertSame('10100', $price->raw_price_rial);
        $this->assertSame('8900', $price->formula_parameters['sell_price_rial']);
        $this->assertSame('1', $price->formula_parameters['settings']['unit_divisor']);
        $this->travel(179)->seconds();
        $this->assertFalse($binding->fresh()->isStale());
        $this->travel(1)->seconds();
        $this->assertTrue($binding->fresh()->isStale());
    }

    public function test_existing_preview_bindings_are_shown_as_manual_and_never_synchronized(): void
    {
        $product = $this->product(['id' => 10]);
        $this->binding($product, 'preview');
        Sanctum::actingAs($this->admin());
        $this->getJson('/api/v1/admin/homegold')->assertOk()
            ->assertJsonPath('data.products.0.binding.mode', 'disabled');
        $this->assertSame([], app(HomeGoldPricingService::class)->refresh(dueOnly: true));
        Http::assertNothingSent();
        $this->assertDatabaseCount('product_prices', 0);
    }

    public function test_independent_offsets_are_saved_previewed_and_applied_to_every_fresh_quote(): void
    {
        $this->freezeTime();
        $product = $this->product(['id' => 10]);
        Sanctum::actingAs($this->admin());
        $this->fakeFeed(buy: 80000000, sell: 79000000);
        $settings = array_merge($this->settings, [
            'mode' => 'auto', 'buy_offset_rial' => '100000000', 'sell_offset_rial' => '-100000000',
        ]);
        $url = '/api/v1/admin/homegold/products/'.$product->id;
        $this->postJson($url.'/preview', $settings)->assertOk()
            ->assertJsonPath('data.buy_price_rial', '900000000')
            ->assertJsonPath('data.sell_price_rial', '690000000');
        $this->assertDatabaseCount('product_prices', 0);
        $this->putJson($url, $settings)->assertOk()
            ->assertJsonPath('data.buy_offset_rial', '100000000')
            ->assertJsonPath('data.sell_offset_rial', '-100000000');
        $this->getJson('/api/v1/admin/homegold')->assertOk()
            ->assertJsonPath('data.products.0.binding.buy_offset_rial', '100000000')
            ->assertJsonPath('data.products.0.binding.sell_offset_rial', '-100000000');
        app(HomeGoldPricingService::class)->refresh(dueOnly: true);
        $price = $product->fresh()->currentPrice;
        $this->assertSame('900000000', $price->raw_price_rial);
        $this->assertSame('690000000', $price->formula_parameters['sell_price_rial']);
        $this->assertSame('100000000', $price->formula_parameters['settings']['buy_offset_rial']);
        $this->fakeFeed(buy: 81000000, sell: 80000000);
        $this->travel(10)->seconds();
        app(HomeGoldPricingService::class)->refresh(dueOnly: true);
        $price = $product->fresh()->currentPrice;
        $this->assertSame('910000000', $price->raw_price_rial);
        $this->assertSame('700000000', $price->formula_parameters['sell_price_rial']);
        $this->assertDatabaseCount('product_prices', 2);
    }

    public function test_invalid_offsets_and_nonpositive_adjusted_prices_are_rejected(): void
    {
        $product = $this->product(['id' => 10]);
        Sanctum::actingAs($this->admin());
        $url = '/api/v1/admin/homegold/products/'.$product->id;
        foreach (['buy_offset_rial', 'sell_offset_rial'] as $field) {
            foreach (['1000000000001', '-1000000000001', 'invalid', '1.5'] as $invalid) {
                $this->putJson($url, array_merge($this->settings, [$field => $invalid]))
                    ->assertUnprocessable()->assertJsonValidationErrors($field);
            }
        }
        foreach (['buy_offset_rial', 'sell_offset_rial'] as $field) {
            $this->postJson($url.'/preview', array_merge($this->settings, [$field => '-10000']))
                ->assertUnprocessable();
            $this->putJson($url, array_merge($this->settings, ['mode' => 'auto', $field => '-10000']))
                ->assertUnprocessable();
        }
        $this->assertDatabaseCount('product_prices', 0);
    }

    public function test_removed_settings_are_fixed_and_preview_mode_is_rejected(): void
    {
        $product = $this->product(['id' => 10]);
        Sanctum::actingAs($this->admin());
        $url = '/api/v1/admin/homegold/products/'.$product->id;
        $this->putJson($url, array_merge($this->settings, [
            'unit_divisor' => 0, 'stale_after_seconds' => 30, 'interval_seconds' => 3600,
            'buy_field' => 'sellPrice', 'sell_field' => 'buyPrice',
            'buy_percent' => 50, 'sell_percent' => -50,
            'buy_offset_rial' => 100, 'sell_offset_rial' => -100,
        ]))->assertOk()->assertJsonPath('data.unit_divisor', '1')
            ->assertJsonPath('data.interval_seconds', 10)->assertJsonPath('data.stale_after_seconds', 180)
            ->assertJsonPath('data.buy_field', 'buyPrice')->assertJsonPath('data.sell_field', 'sellPrice');
        $this->putJson($url, array_merge($this->settings, ['mode' => 'preview']))->assertUnprocessable();
        $derived = $this->derivedProduct(attributes: ['id' => 11]);
        $this->putJson('/api/v1/admin/homegold/products/'.$derived->id, array_merge($this->settings, ['mode' => 'auto']))->assertUnprocessable();
    }

    public function test_changing_settings_invalidates_auto_until_next_sync_and_manual_mode_releases_it(): void
    {
        $product = $this->product(['id' => 10]);
        $binding = $this->binding($product);
        app(HomeGoldPricingService::class)->refresh();
        Sanctum::actingAs($this->admin());
        $url = '/api/v1/admin/homegold/products/'.$product->id;
        $this->putJson($url, array_merge($this->settings, ['mode' => 'auto', 'currency_multiplier' => 1]))->assertOk();
        $this->assertTrue($binding->fresh()->isStale());
        $this->putJson($url, array_merge($this->settings, ['mode' => 'disabled']))->assertOk();
        $this->assertFalse($binding->fresh()->isStale());
        app(ProductPricingService::class)->createManualPrice($product, '11000', $this->admin()->id);
        $product = $product->fresh();
        $this->assertSame('11000', $product->currentPrice->raw_price_rial);
        $this->assertNotSame('homegold_external', $product->currentPrice->formula_key);
    }

    public function test_manual_price_updates_are_blocked_when_auto_is_active(): void
    {
        $product = $this->product(['id' => 10]);
        $this->binding($product);
        Sanctum::actingAs($this->admin());
        $this->postJson('/api/v1/admin/products/'.$product->id.'/prices', ['raw_price_rial' => '200000'])->assertConflict();
        $this->assertDatabaseCount('product_prices', 0);
    }

    public function test_price_step_changes_are_blocked_during_auto_and_allowed_after_switching_to_manual(): void
    {
        $product = $this->product(['id' => 10]);
        $binding = $this->binding($product);
        Sanctum::actingAs($this->admin());
        $url = '/api/v1/admin/products/'.$product->id.'/price-step';
        $this->patchJson($url, ['price_step_rial' => 20000])->assertConflict();
        $binding->update(['mode' => 'disabled']);
        $this->patchJson($url, ['price_step_rial' => 20000])->assertOk();
        $this->assertSame(20000, (int) $product->fresh()->price_step_rial);
    }

    public function test_api_product_three_does_not_trigger_linked_product_one_changes(): void
    {
        $one = $this->product(['id' => 1]);
        $three = $this->product(['id' => 3]);
        $this->binding($three);
        app(HomeGoldPricingService::class)->refresh();
        $this->assertSame(0, $one->fresh()->prices()->count());
        $this->assertSame(1, $three->fresh()->prices()->count());
    }

    public function test_manual_product_three_changes_do_not_overwrite_automatic_product_one(): void
    {
        $one = $this->product(['id' => 1]);
        $three = $this->product(['id' => 3]);
        $this->binding($one);
        app(HomeGoldPricingService::class)->refresh();
        $onePrice = $one->fresh()->currentPrice->id;
        $admin = $this->admin();
        app(ProductPricingService::class)->createManualPrice($three, '100000', $admin->id);
        app(ProductPricingService::class)->createManualPrice($three, '101000', $admin->id);
        $this->assertSame($onePrice, $one->fresh()->currentPrice->id);
    }

    public function test_linked_manual_changes_preserve_the_spread_of_a_frozen_api_price(): void
    {
        $one = $this->product(['id' => 1]);
        $three = $this->product(['id' => 3]);
        $binding = $this->binding($one);
        app(HomeGoldPricingService::class)->refresh();
        $binding->update(['mode' => 'disabled']);
        $admin = $this->admin();
        app(ProductPricingService::class)->createManualPrice($three, '100000', $admin->id);
        app(ProductPricingService::class)->createManualPrice($three, '101000', $admin->id);
        $this->assertSame('1000', $one->fresh()->sellDifferenceFor());
    }

    public function test_customer_order_is_blocked_after_quote_expires(): void
    {
        $customer = $this->customer();
        $product = $this->product(['id' => 10]);
        $this->binding($product);
        app(HomeGoldPricingService::class)->refresh();
        $customer->forceFill(['role_id' => Role::where('slug', 'customer')->firstOrFail()->id])->save();
        $customer->unsetRelation('accessRole');
        $customer->accessRole->products()->syncWithoutDetaching([$product->id => ['can_access' => true, 'can_buy' => true]]);
        $this->travel(181)->seconds();
        Sanctum::actingAs($customer->fresh());
        $payload = ['product_id' => $product->id, 'trade_type' => 'customer_buy', 'entry_mode' => 'quantity', 'quantity' => '1'];
        $this->postJson('/api/v1/trade/preview', $payload)->assertUnprocessable();
        $payload += ['client_reference' => (string) Str::uuid(), 'expected_product_price_id' => $product->fresh()->currentPrice->id];
        $this->postJson('/api/v1/purchase-requests', $payload)->assertUnprocessable();
        $this->assertDatabaseCount('purchase_requests', 0);
    }
}
