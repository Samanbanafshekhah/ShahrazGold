<?php

namespace Tests\Feature;

use App\Enums\PricingMode;
use App\Enums\PurchaseRequestStatus;
use App\Models\AppSetting;
use App\Models\ProductPrice;
use App\Models\PurchaseRequest;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\CreatesDomain;
use Tests\TestCase;

class TransactionLimitTest extends TestCase
{
    use CreatesDomain, RefreshDatabase;

    private function market(?User $customer = null, array $productAttributes = [], string $priceRial = '100000000'): array
    {
        AppSetting::setManagerOnline(true);
        $product = $this->product(array_merge([
            'id' => 10,
            'trade_adjustment_enabled' => false,
            'trade_adjustment_percent' => '0',
        ], $productAttributes));
        $price = ProductPrice::create([
            'product_id' => $product->id,
            'raw_price_rial' => $priceRial,
            'pricing_mode' => PricingMode::Manual,
            'effective_at' => now()->utc(),
        ]);

        if ($customer) {
            $role = Role::query()->where('slug', 'customer')->firstOrFail();
            $role->products()->syncWithoutDetaching([
                $product->id => ['can_access' => true, 'can_buy' => true],
            ]);
            $customer->forceFill(['role_id' => $role->id])->save();
        }

        return [$product, $price];
    }

    private function payload($product, $price, string $quantity = '1', string $tradeType = 'customer_buy'): array
    {
        return [
            'product_id' => $product->id,
            'trade_type' => $tradeType,
            'entry_mode' => 'quantity',
            'quantity' => $quantity,
            'client_reference' => (string) Str::uuid(),
            'expected_product_price_id' => $price->id,
        ];
    }

    public function test_unlimited_user_can_trade_and_zero_limit_cannot(): void
    {
        $unlimited = $this->customer(['transaction_limit_rial' => null]);
        [$product, $price] = $this->market($unlimited);
        Sanctum::actingAs($unlimited);

        $this->postJson('/api/v1/purchase-requests', $this->payload($product, $price))
            ->assertCreated();
        $this->getJson('/api/v1/auth/me')
            ->assertOk()
            ->assertJsonPath('data.transaction_limit', null)
            ->assertJsonPath('data.transaction_limit_unlimited', true);

        $blocked = $this->customer(['transaction_limit_rial' => 0]);
        [$blockedProduct, $blockedPrice] = $this->market($blocked, ['id' => 11, 'slug' => 'blocked-product', 'symbol' => 'BLOCKED']);
        Sanctum::actingAs($blocked);

        $this->postJson('/api/v1/purchase-requests', $this->payload($blockedProduct, $blockedPrice))
            ->assertUnprocessable()
            ->assertJsonPath('message', 'سقف مجاز معاملات شما تکمیل شده است. برای افزایش حد معامله با مدیریت تماس بگیرید.');
    }

    public function test_buy_and_sell_both_consume_the_limit(): void
    {
        $customer = $this->customer(['transaction_limit_rial' => 200_000_000]);
        [$product, $price] = $this->market($customer);
        Sanctum::actingAs($customer);

        $this->postJson('/api/v1/purchase-requests', $this->payload($product, $price, '0.5'))
            ->assertCreated();
        $this->postJson('/api/v1/purchase-requests', $this->payload($product, $price, '0.5', 'customer_sell'))
            ->assertCreated();

        $this->getJson('/api/v1/auth/me')
            ->assertJsonPath('data.transaction_limit_used', 100_000_000)
            ->assertJsonPath('data.transaction_limit_remaining', 100_000_000);
    }

    public function test_pending_requests_reserve_limit_and_exact_remaining_amount_is_allowed(): void
    {
        $customer = $this->customer(['transaction_limit_rial' => 200_000_000]);
        [$product, $price] = $this->market($customer);
        Sanctum::actingAs($customer);

        $firstId = $this->postJson('/api/v1/purchase-requests', $this->payload($product, $price, '1.5'))
            ->assertCreated()
            ->assertJsonPath('data.total_amount_rial', '150000000')
            ->json('data.id');

        Sanctum::actingAs($this->admin());
        $this->postJson("/api/v1/admin/purchase-requests/{$firstId}/approve")->assertOk();
        $this->postJson("/api/v1/admin/purchase-requests/{$firstId}/complete")->assertOk();

        Sanctum::actingAs($customer);
        $this->postJson('/api/v1/purchase-requests', $this->payload($product, $price, '0.5'))
            ->assertCreated();
        $this->postJson('/api/v1/purchase-requests', $this->payload($product, $price, '0.000001'))
            ->assertUnprocessable()
            ->assertJsonPath('message', 'سقف مجاز معاملات شما تکمیل شده است. برای افزایش حد معامله با مدیریت تماس بگیرید.');

        $this->getJson('/api/v1/auth/me')
            ->assertJsonPath('data.transaction_limit_used', 200_000_000)
            ->assertJsonPath('data.transaction_limit_remaining', 0);
    }

    public function test_amount_above_remaining_is_rejected_with_remaining_toman_message(): void
    {
        $customer = $this->customer(['transaction_limit_rial' => 200_000_000]);
        [$product, $price] = $this->market($customer);
        Sanctum::actingAs($customer);

        $this->postJson('/api/v1/purchase-requests', $this->payload($product, $price, '1.5'))->assertCreated();
        $this->postJson('/api/v1/purchase-requests', [
            'product_id' => $product->id,
            'trade_type' => 'customer_buy',
            'entry_mode' => 'amount',
            'amount_rial' => '50000010',
            'client_reference' => (string) Str::uuid(),
            'expected_product_price_id' => $price->id,
        ])
            ->assertUnprocessable()
            ->assertJsonPath('message', 'مبلغ این معامله بیشتر از حد معامله باقی‌مانده شما است. سقف باقی‌مانده: ۵,۰۰۰,۰۰۰ تومان');
    }

    public function test_rejected_and_cancelled_requests_release_reserved_limit(): void
    {
        $customer = $this->customer(['transaction_limit_rial' => 100_000_000]);
        [$product, $price] = $this->market($customer);
        Sanctum::actingAs($customer);

        $rejectedId = $this->postJson('/api/v1/purchase-requests', $this->payload($product, $price))
            ->assertCreated()->json('data.id');
        $admin = $this->admin();
        Sanctum::actingAs($admin);
        $this->postJson("/api/v1/admin/purchase-requests/{$rejectedId}/reject")->assertOk();

        Sanctum::actingAs($customer);
        $cancelledId = $this->postJson('/api/v1/purchase-requests', $this->payload($product, $price))
            ->assertCreated()->json('data.id');
        $this->postJson("/api/v1/purchase-requests/{$cancelledId}/cancel")->assertOk();
        $this->postJson('/api/v1/purchase-requests', $this->payload($product, $price))->assertCreated();

        $this->assertSame(100_000_000, (int) PurchaseRequest::query()
            ->where('user_id', $customer->id)
            ->whereIn('status', [PurchaseRequestStatus::Pending, PurchaseRequestStatus::Approved, PurchaseRequestStatus::Completed])
            ->sum('total_amount_rial'));
    }

    public function test_admin_can_set_reduce_and_remove_limit_but_customer_cannot(): void
    {
        $customer = $this->customer();
        [$product, $price] = $this->market($customer);
        Sanctum::actingAs($customer);
        $this->postJson('/api/v1/purchase-requests', $this->payload($product, $price))->assertCreated();
        $this->patchJson('/api/v1/admin/users/'.$customer->id, ['transaction_limit' => 1])->assertForbidden();

        Sanctum::actingAs($this->admin());
        $identity = ['first_name' => $customer->first_name, 'last_name' => $customer->last_name, 'mobile' => $customer->mobile];
        $this->patchJson('/api/v1/admin/users/'.$customer->id, $identity + ['transaction_limit' => 50_000_000])
            ->assertOk()
            ->assertJsonPath('data.transaction_limit', 50_000_000)
            ->assertJsonPath('data.transaction_limit_used', 100_000_000)
            ->assertJsonPath('data.transaction_limit_remaining', 0);
        $this->patchJson('/api/v1/admin/users/'.$customer->id, $identity + ['transaction_limit' => null])
            ->assertOk()
            ->assertJsonPath('data.transaction_limit_unlimited', true);
    }

    public function test_product_specific_final_amount_is_used_for_limit(): void
    {
        $customer = $this->customer(['transaction_limit_rial' => 18_467_945]);
        [$product, $price] = $this->market($customer, [
            'id' => 3,
            'slug' => 'abshodeh-limit',
            'symbol' => 'ABSHODEH-LIMIT',
            'trade_adjustment_enabled' => true,
            'trade_adjustment_percent' => '1.0000',
        ], '40000000');
        Sanctum::actingAs($customer);

        $this->postJson('/api/v1/purchase-requests', $this->payload($product, $price, '2'))
            ->assertCreated()
            ->assertJsonPath('data.total_amount_rial', '18467945');
        $this->postJson('/api/v1/purchase-requests', $this->payload($product, $price, '0.000001'))
            ->assertUnprocessable();
    }

    public function test_multiple_active_requests_cannot_collectively_exceed_limit(): void
    {
        $customer = $this->customer(['transaction_limit_rial' => 50_000_000]);
        [$product, $price] = $this->market($customer);
        Sanctum::actingAs($customer);

        $this->postJson('/api/v1/purchase-requests', $this->payload($product, $price, '0.4'))->assertCreated();
        $this->postJson('/api/v1/purchase-requests', $this->payload($product, $price, '0.4'))->assertUnprocessable();
        $this->assertDatabaseCount('purchase_requests', 1);
    }
}
