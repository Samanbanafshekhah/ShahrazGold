<?php

namespace Tests\Feature;

use App\Enums\PricingMode;
use App\Enums\ProductUnit;
use App\Models\AppSetting;
use App\Models\ProductPrice;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\TestCase;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\CreatesDomain;

class TransactionLimitTest extends TestCase
{
    use CreatesDomain, RefreshDatabase;

    private function market(User $customer, ProductUnit $unit = ProductUnit::Gram): array
    {
        AppSetting::setManagerOnline(true);
        $product = $this->product(['unit' => $unit, 'id' => $unit === ProductUnit::Count ? 11 : 10]);
        $price = ProductPrice::create([
            'product_id' => $product->id, 'raw_price_rial' => '100000000',
            'pricing_mode' => PricingMode::Manual, 'effective_at' => now()->utc(),
        ]);
        $role = Role::query()->where('slug', 'customer')->firstOrFail();
        $role->products()->syncWithoutDetaching([$product->id => ['can_access' => true, 'can_buy' => true]]);
        $customer->forceFill(['role_id' => $role->id])->save();

        return [$product, $price];
    }

    private function payload($product, $price, string $quantity = '1', string $tradeType = 'customer_buy'): array
    {
        return [
            'product_id' => $product->id, 'trade_type' => $tradeType, 'entry_mode' => 'quantity',
            'quantity' => $quantity, 'client_reference' => (string) Str::uuid(),
            'expected_product_price_id' => $price->id,
        ];
    }

    public function test_weight_and_count_limits_are_independent_and_reserve_pending_buys(): void
    {
        $customer = $this->customer(['purchase_limit_grams' => '1.500001', 'purchase_limit_count' => 2]);
        [$gold, $goldPrice] = $this->market($customer);
        [$coin, $coinPrice] = $this->market($customer, ProductUnit::Count);
        Sanctum::actingAs($customer);
        $this->postJson('/api/v1/purchase-requests', $this->payload($gold, $goldPrice, '1.5'))->assertCreated();
        $this->postJson('/api/v1/purchase-requests', $this->payload($coin, $coinPrice, '2'))->assertCreated();
        $this->postJson('/api/v1/purchase-requests', $this->payload($gold, $goldPrice, '0.000001'))->assertCreated();
        $this->postJson('/api/v1/purchase-requests', $this->payload($gold, $goldPrice, '0.000001'))->assertUnprocessable();
        $this->postJson('/api/v1/purchase-requests', $this->payload($coin, $coinPrice))->assertUnprocessable();
        $this->getJson('/api/v1/auth/me')->assertOk()
            ->assertJsonPath('data.purchase_limits.grams.used', '1.500001')
            ->assertJsonPath('data.purchase_limits.count.used', '2.000000')
            ->assertJsonPath('data.purchase_limits.grams.remaining', 0)
            ->assertJsonPath('data.purchase_limits.count.remaining', 0);
    }

    public function test_zero_blocks_buys_but_sells_do_not_consume_purchase_limits(): void
    {
        $customer = $this->customer(['purchase_limit_grams' => 0, 'purchase_limit_count' => 0]);
        [$product, $price] = $this->market($customer);
        Sanctum::actingAs($customer);
        $this->postJson('/api/v1/purchase-requests', $this->payload($product, $price))->assertUnprocessable();
        $this->postJson('/api/v1/purchase-requests', $this->payload($product, $price, '3', 'customer_sell'))->assertCreated();
        $this->getJson('/api/v1/auth/me')->assertJsonPath('data.purchase_limits.grams.used', '0');
    }

    public function test_null_is_unlimited_and_old_monetary_limit_is_not_applied(): void
    {
        $customer = $this->customer(['transaction_limit_rial' => 0]);
        [$product, $price] = $this->market($customer);
        Sanctum::actingAs($customer);
        $this->postJson('/api/v1/purchase-requests', $this->payload($product, $price, '5'))->assertCreated();
        $this->getJson('/api/v1/auth/me')->assertJsonPath('data.purchase_limits.grams.limit', null);
    }

    public function test_rejection_and_cancellation_release_reserved_quantities(): void
    {
        $customer = $this->customer(['purchase_limit_grams' => '1']);
        [$product, $price] = $this->market($customer);
        Sanctum::actingAs($customer);
        $id = $this->postJson('/api/v1/purchase-requests', $this->payload($product, $price))->assertCreated()->json('data.id');
        Sanctum::actingAs($this->admin());
        $this->postJson("/api/v1/admin/purchase-requests/{$id}/reject")->assertOk();
        Sanctum::actingAs($customer);
        $id = $this->postJson('/api/v1/purchase-requests', $this->payload($product, $price))->assertCreated()->json('data.id');
        $this->postJson("/api/v1/purchase-requests/{$id}/cancel")->assertOk();
        $id = $this->postJson('/api/v1/purchase-requests', $this->payload($product, $price))->assertCreated()->json('data.id');
        Sanctum::actingAs($this->admin());
        $this->postJson("/api/v1/admin/purchase-requests/{$id}/approve")->assertOk();
        $this->postJson("/api/v1/admin/purchase-requests/{$id}/complete")->assertOk();
        Sanctum::actingAs($customer);
        $this->postJson('/api/v1/purchase-requests', $this->payload($product, $price))->assertUnprocessable();
    }

    public function test_amount_entry_is_checked_using_calculated_weight(): void
    {
        $customer = $this->customer(['purchase_limit_grams' => '0.5']);
        [$product, $price] = $this->market($customer);
        Sanctum::actingAs($customer);
        $payload = $this->payload($product, $price);
        unset($payload['quantity']);
        $payload['entry_mode'] = 'amount';
        $payload['amount_rial'] = '50000100';
        $this->postJson('/api/v1/purchase-requests', $payload)->assertUnprocessable();
        $payload['amount_rial'] = '50000000';
        $this->postJson('/api/v1/purchase-requests', $payload)->assertCreated();
    }

    public function test_mithqal_purchases_are_converted_to_grams(): void
    {
        $customer = $this->customer(['purchase_limit_grams' => '4.6083']);
        [$product, $price] = $this->market($customer, ProductUnit::Mithqal);
        Sanctum::actingAs($customer);
        $this->postJson('/api/v1/purchase-requests', $this->payload($product, $price))->assertCreated();
        $this->postJson('/api/v1/purchase-requests', $this->payload($product, $price, '0.000001'))->assertUnprocessable();
        $this->getJson('/api/v1/auth/me')->assertJsonPath('data.purchase_limits.grams.used', '4.608300');
    }

    public function test_only_admin_can_set_quantity_limits_and_count_must_be_integer(): void
    {
        $customer = $this->customer();
        Sanctum::actingAs($customer);
        $this->patchJson('/api/v1/admin/users/'.$customer->id, ['purchase_limit_grams' => '2.5'])->assertForbidden();
        Sanctum::actingAs($this->admin());
        $identity = ['first_name' => $customer->first_name, 'last_name' => $customer->last_name, 'mobile' => $customer->mobile];
        $this->patchJson('/api/v1/admin/users/'.$customer->id, $identity + ['purchase_limit_grams' => '2.5', 'purchase_limit_count' => 3])
            ->assertOk()->assertJsonPath('data.purchase_limits.grams.limit', 2.5)->assertJsonPath('data.purchase_limits.count.limit', 3);
        $this->patchJson('/api/v1/admin/users/'.$customer->id, $identity + ['purchase_limit_count' => 1.5])->assertUnprocessable();
        $this->patchJson('/api/v1/admin/users/'.$customer->id, $identity + ['purchase_limit_grams' => '-1'])->assertUnprocessable();
        $this->patchJson('/api/v1/admin/users/'.$customer->id, $identity + ['purchase_limit_grams' => '0.0000001'])->assertUnprocessable();
        $this->patchJson('/api/v1/admin/users/'.$customer->id, $identity + ['purchase_limit_grams' => null, 'purchase_limit_count' => null])
            ->assertOk()->assertJsonPath('data.purchase_limits.grams.limit', null)->assertJsonPath('data.purchase_limits.count.limit', null);
    }

    public function test_reducing_limit_below_consumption_blocks_new_buys(): void
    {
        $customer = $this->customer();
        [$product, $price] = $this->market($customer);
        Sanctum::actingAs($customer);
        $this->postJson('/api/v1/purchase-requests', $this->payload($product, $price, '2'))->assertCreated();
        Sanctum::actingAs($this->admin());
        $identity = ['first_name' => $customer->first_name, 'last_name' => $customer->last_name, 'mobile' => $customer->mobile];
        $this->patchJson('/api/v1/admin/users/'.$customer->id, $identity + ['purchase_limit_grams' => '1'])
            ->assertOk()->assertJsonPath('data.purchase_limits.grams.remaining', 0);
        Sanctum::actingAs($customer->fresh());
        $this->postJson('/api/v1/purchase-requests', $this->payload($product, $price, '0.000001'))->assertUnprocessable();
    }

    public function test_price_changes_do_not_change_quantity_consumption_and_retries_are_idempotent(): void
    {
        $customer = $this->customer(['purchase_limit_grams' => '2']);
        [$product, $price] = $this->market($customer);
        Sanctum::actingAs($customer);
        $payload = $this->payload($product, $price, '1');
        $this->postJson('/api/v1/purchase-requests', $payload)->assertCreated();
        $this->postJson('/api/v1/purchase-requests', $payload)->assertCreated();
        $this->assertDatabaseCount('purchase_requests', 1);
        $price = ProductPrice::create([
            'product_id' => $product->id, 'raw_price_rial' => '200000000',
            'pricing_mode' => PricingMode::Manual, 'effective_at' => now()->utc()->addSecond(),
        ]);
        $this->postJson('/api/v1/purchase-requests', $this->payload($product, $price, '1'))->assertCreated();
        $this->postJson('/api/v1/purchase-requests', $this->payload($product, $price, '0.000001'))->assertUnprocessable();
    }
}
