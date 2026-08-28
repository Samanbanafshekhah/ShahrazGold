<?php

namespace Tests\Feature;

use App\Enums\PricingMode;
use App\Enums\ProductUnit;
use App\Events\PurchaseRequestApproved;
use App\Events\PurchaseRequestCreated;
use App\Events\PurchaseRequestRejected;
use App\Models\AppSetting;
use App\Models\ProductPrice;
use App\Models\PurchaseRequest;
use App\Models\Role;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\CreatesDomain;
use Tests\TestCase;

class TradeAndPurchaseRequestTest extends TestCase
{
    use CreatesDomain,RefreshDatabase;

    private function pricedProduct(array $attributes = []): array
    {
        AppSetting::setManagerOnline(true);
        $product = $this->product(array_merge(['trade_adjustment_enabled' => true, 'trade_adjustment_percent' => '1.0000'], $attributes));
        $price = ProductPrice::create(['product_id' => $product->id, 'raw_price_rial' => '100000000', 'pricing_mode' => PricingMode::Manual, 'effective_at' => now()->utc()]);

        return [$product, $price];
    }

    private function payload($product, $price, array $extra = []): array
    {
        return array_merge(['product_id' => $product->id, 'trade_type' => 'customer_buy', 'entry_mode' => 'quantity', 'quantity' => '1.25', 'client_reference' => (string) Str::uuid(), 'expected_product_price_id' => $price->id], $extra);
    }

    public function test_preview_buy_sell_quantity_amount_and_disabled_adjustment(): void
    {
        Sanctum::actingAs($this->customer());
        [$product] = $this->pricedProduct();
        $this->postJson('/api/v1/trade/preview', ['product_id' => $product->id, 'trade_type' => 'customer_buy', 'entry_mode' => 'quantity', 'quantity' => '1.25', 'raw_unit_price_rial' => '1'])->assertStatus(422);
        $this->postJson('/api/v1/trade/preview', ['product_id' => $product->id, 'trade_type' => 'customer_buy', 'entry_mode' => 'quantity', 'quantity' => '1.25'])->assertOk()->assertJsonPath('data.raw_unit_price_rial', '100000000')->assertJsonPath('data.final_unit_price_rial', '101000000')->assertJsonPath('data.total_amount_rial', '126250000');
        $this->postJson('/api/v1/trade/preview', ['product_id' => $product->id, 'trade_type' => 'customer_sell', 'entry_mode' => 'amount', 'amount_rial' => '198000000'])->assertOk()->assertJsonPath('data.final_unit_price_rial', '99000000')->assertJsonPath('data.quantity', '2');
        $product->update(['trade_adjustment_enabled' => false]);
        $this->postJson('/api/v1/trade/preview', ['product_id' => $product->id, 'trade_type' => 'customer_buy', 'entry_mode' => 'quantity', 'quantity' => '1'])->assertJsonPath('data.final_unit_price_rial', '100000000');
    }

    public function test_count_accepts_amount_or_integer_quantity_but_rejects_fractional_quantity(): void
    {
        Sanctum::actingAs($this->customer());
        [$count] = $this->pricedProduct(['unit' => ProductUnit::Count]);
        $this->postJson('/api/v1/trade/preview', ['product_id' => $count->id, 'trade_type' => 'customer_buy', 'entry_mode' => 'quantity', 'quantity' => '1.5'])->assertStatus(422);
        $this->postJson('/api/v1/trade/preview', ['product_id' => $count->id, 'trade_type' => 'customer_buy', 'entry_mode' => 'amount', 'amount_rial' => '100000000'])->assertOk()->assertJsonPath('data.quantity', '0.990099');
        [$weight] = $this->pricedProduct(['slug' => 'weight', 'symbol' => 'WEIGHT', 'unit' => ProductUnit::Gram]);
        $this->postJson('/api/v1/trade/preview', ['product_id' => $weight->id, 'trade_type' => 'customer_buy', 'entry_mode' => 'quantity', 'quantity' => '0.123456'])->assertOk()->assertJsonPath('data.quantity', '0.123456');
    }

    public function test_create_snapshots_idempotency_price_change_and_ownership(): void
    {
        $customer = $this->customer();
        Sanctum::actingAs($customer);
        [$product,$price] = $this->pricedProduct();
        $payload = $this->payload($product, $price);
        $created = $this->postJson('/api/v1/purchase-requests', $payload)->assertCreated()->assertJsonPath('data.raw_unit_price_rial', '100000000')->assertJsonPath('data.trade_adjustment_percent', '1.0000');
        $this->postJson('/api/v1/purchase-requests', $payload)->assertCreated();
        $this->assertSame(1, PurchaseRequest::count());
        $other = $this->customer();
        Sanctum::actingAs($other);
        $this->getJson('/api/v1/purchase-requests/'.$created->json('data.id'))->assertForbidden();
        $new = ProductPrice::create(['product_id' => $product->id, 'raw_price_rial' => '110000000', 'pricing_mode' => PricingMode::Manual, 'effective_at' => now()->addSecond()]);
        $this->postJson('/api/v1/purchase-requests', $this->payload($product, $price))->assertStatus(409)->assertJsonPath('message', 'PRICE_CHANGED')->assertJsonPath('data.preview.product_price_id', $new->id);
    }

    public function test_product_three_keeps_displayed_unit_prices_and_converts_totals_once(): void
    {
        AppSetting::setManagerOnline(true);
        $product = $this->product([
            'id' => 3,
            'name' => 'آبشده نقدی',
            'slug' => 'abshodeh-nagdi',
            'symbol' => 'ABSHODEH',
            'sell_price_difference_rial' => 500_000,
        ]);
        $price = ProductPrice::create([
            'product_id' => $product->id,
            'raw_price_rial' => '40000000',
            'pricing_mode' => PricingMode::Manual,
            'effective_at' => now()->utc(),
        ]);
        $customerRole = Role::query()->where('slug', 'customer')->firstOrFail();
        $customerRole->products()->attach($product->id, ['can_access' => true, 'can_buy' => true]);
        $customer = $this->customer(['role_id' => $customerRole->id]);
        Sanctum::actingAs($customer);

        $this->getJson('/api/v1/products/abshodeh-nagdi')
            ->assertOk()
            ->assertJsonPath('data.current_price.raw_price_rial', '40000000')
            ->assertJsonPath('data.current_price.buy_price_rial', '40000000')
            ->assertJsonPath('data.current_price.sell_price_rial', '39500000')
            ->assertJsonPath('data.trade_amount_divisor', '4.33183');

        $this->postJson('/api/v1/trade/preview', [
            'product_id' => 3,
            'trade_type' => 'customer_buy',
            'entry_mode' => 'quantity',
            'quantity' => '2',
            'final_unit_price_rial' => '1',
        ])->assertUnprocessable();

        $this->postJson('/api/v1/trade/preview', [
            'product_id' => 3,
            'trade_type' => 'customer_buy',
            'entry_mode' => 'quantity',
            'quantity' => '2',
        ])
            ->assertOk()
            ->assertJsonPath('data.final_unit_price_rial', '40000000')
            ->assertJsonPath('data.calculation_unit_price_rial', '9233973')
            ->assertJsonPath('data.total_amount_rial', '18467945');

        $buy = $this->postJson('/api/v1/purchase-requests', $this->payload($product, $price, [
            'quantity' => '2',
        ]))
            ->assertCreated()
            ->assertJsonPath('data.final_unit_price_rial', '40000000')
            ->assertJsonPath('data.total_amount_rial', '18467945');

        $sell = $this->postJson('/api/v1/purchase-requests', $this->payload($product, $price, [
            'trade_type' => 'customer_sell',
            'quantity' => '2',
        ]))
            ->assertCreated()
            ->assertJsonPath('data.final_unit_price_rial', '39500000')
            ->assertJsonPath('data.total_amount_rial', '18237096');

        $this->assertDatabaseHas('purchase_requests', [
            'id' => $buy->json('data.id'),
            'product_id' => 3,
            'raw_unit_price_rial' => '40000000',
            'final_unit_price_rial' => '40000000',
            'total_amount_rial' => '18467945',
        ]);
        $this->assertDatabaseHas('purchase_requests', [
            'id' => $sell->json('data.id'),
            'product_id' => 3,
            'raw_unit_price_rial' => '40000000',
            'final_unit_price_rial' => '39500000',
            'total_amount_rial' => '18237096',
        ]);
    }

    public function test_buy_and_sell_are_rejected_when_manager_is_offline(): void
    {
        Sanctum::actingAs($this->customer());
        [$product, $price] = $this->pricedProduct();
        AppSetting::setManagerOnline(false);

        $this->postJson('/api/v1/purchase-requests', $this->payload($product, $price))
            ->assertStatus(409)
            ->assertJsonPath('message', 'MANAGER_OFFLINE');
        $this->postJson('/api/v1/purchase-requests', $this->payload($product, $price, ['trade_type' => 'customer_sell']))
            ->assertStatus(409)
            ->assertJsonPath('message', 'MANAGER_OFFLINE');
        $this->assertSame(0, PurchaseRequest::count());
    }

    public function test_status_transitions_history_events_and_invalid_transition(): void
    {
        Event::fake([PurchaseRequestCreated::class, PurchaseRequestApproved::class, PurchaseRequestRejected::class]);
        $customer = $this->customer();
        Sanctum::actingAs($customer);
        [$product,$price] = $this->pricedProduct();
        $id = $this->postJson('/api/v1/purchase-requests', $this->payload($product, $price))->assertCreated()->json('data.id');
        Event::assertDispatched(PurchaseRequestCreated::class);
        $admin = $this->admin();
        Sanctum::actingAs($admin);
        $this->postJson("/api/v1/admin/purchase-requests/$id/approve", ['note' => 'ok'])->assertOk()->assertJsonPath('data.status', 'approved');
        $this->postJson("/api/v1/admin/purchase-requests/$id/complete")->assertOk()->assertJsonPath('data.status', 'completed');
        $this->postJson("/api/v1/admin/purchase-requests/$id/reject")->assertStatus(409);
        $this->assertSame(2, PurchaseRequest::find($id)->histories()->count());
        Event::assertDispatched(PurchaseRequestApproved::class);

        Sanctum::actingAs($customer);
        $rejectedId = $this->postJson('/api/v1/purchase-requests', $this->payload($product, $price))->assertCreated()->json('data.id');
        Sanctum::actingAs($admin);
        $this->postJson("/api/v1/admin/purchase-requests/$rejectedId/reject", ['note' => 'rejected'])->assertOk()->assertJsonPath('data.status', 'rejected');
        Event::assertDispatched(PurchaseRequestRejected::class);
        $this->assertSame(1, PurchaseRequest::find($rejectedId)->histories()->count());
    }

    public function test_owner_can_only_cancel_pending_request(): void
    {
        $customer = $this->customer();
        Sanctum::actingAs($customer);
        [$product,$price] = $this->pricedProduct();
        $id = $this->postJson('/api/v1/purchase-requests', $this->payload($product, $price))->json('data.id');
        $this->postJson("/api/v1/purchase-requests/$id/cancel")->assertOk()->assertJsonPath('data.status', 'cancelled');
        $this->assertSame(1, PurchaseRequest::find($id)->histories()->count());
        $this->postJson("/api/v1/purchase-requests/$id/cancel")->assertStatus(409);
    }
}
