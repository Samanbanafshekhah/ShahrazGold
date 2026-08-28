<?php

namespace Tests\Feature;

use App\Enums\PricingMode;
use App\Events\PriceUpdated;
use App\Models\ProductPrice;
use App\Models\Role;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Laravel\Sanctum\Sanctum;
use Tests\CreatesDomain;
use Tests\TestCase;

class RealtimePriceBroadcastTest extends TestCase
{
    use CreatesDomain, RefreshDatabase;

    public function test_valid_admin_price_write_persists_and_dispatches_immediate_broadcast(): void
    {
        Event::fake([PriceUpdated::class]);
        $product = $this->product();
        Sanctum::actingAs($this->admin());

        $this->postJson("/api/v1/admin/products/{$product->id}/prices", [
            'raw_price_rial' => 0,
        ])->assertUnprocessable();
        Event::assertNotDispatched(PriceUpdated::class);

        $this->postJson("/api/v1/admin/products/{$product->id}/prices", [
            'raw_price_rial' => '75000000',
        ])->assertCreated();

        $this->assertDatabaseHas('product_prices', [
            'product_id' => $product->id,
            'raw_price_rial' => '75000000',
        ]);
        $this->assertSame(1, $product->fresh()->price_version);
        Event::assertDispatched(PriceUpdated::class, fn (PriceUpdated $event) => $event instanceof ShouldBroadcastNow);
    }

    public function test_event_payload_is_minimal_versioned_and_fans_out_by_authorized_role(): void
    {
        Event::fake([PriceUpdated::class]);
        $product = $this->product(['sell_price_difference_rial' => 500_000]);
        $role = Role::query()->where('slug', 'customer')->firstOrFail();
        $role->products()->attach($product->id, ['can_access' => true, 'can_buy' => true]);
        Sanctum::actingAs($this->admin());

        $this->postJson("/api/v1/admin/products/{$product->id}/prices", [
            'raw_price_rial' => '75000000',
        ])->assertCreated();

        Event::assertDispatched(PriceUpdated::class, function (PriceUpdated $event) use ($product, $role): bool {
            $channels = collect($event->broadcastOn())->map(fn (PrivateChannel $channel) => $channel->name)->all();
            $payload = $event->broadcastWith();

            $this->assertSame(['private-prices.admin', "private-prices.role.{$role->id}"], $channels);
            $this->assertSame($product->id, $payload['product_id']);
            $this->assertSame('75000000', $payload['raw_price_rial']);
            $this->assertSame('500000', $payload['sell_price_difference_rial']);
            $this->assertSame(1, $payload['price_version']);
            $this->assertArrayNotHasKey('created_by', $payload);

            return true;
        });
    }

    public function test_private_channel_auth_requires_an_active_user_in_the_matching_role(): void
    {
        config()->set('broadcasting.default', 'reverb');
        config()->set('broadcasting.connections.reverb.key', 'test-key');
        config()->set('broadcasting.connections.reverb.secret', 'test-secret');
        config()->set('broadcasting.connections.reverb.app_id', 'test-app');

        $customerRole = Role::query()->where('slug', 'customer')->firstOrFail();
        $customer = $this->customer(['role_id' => $customerRole->id]);
        Sanctum::actingAs($customer);

        $request = ['socket_id' => '1234.5678', 'channel_name' => "private-prices.role.{$customerRole->id}"];
        $this->postJson('/api/broadcasting/auth', $request)->assertOk()->assertJsonStructure(['auth']);
        $this->postJson('/api/broadcasting/auth', [
            ...$request,
            'channel_name' => 'private-prices.admin',
        ])->assertForbidden();

        $customer->update(['is_active' => false]);
        $this->postJson('/api/broadcasting/auth', $request)->assertForbidden();
    }

    public function test_product_three_broadcast_keeps_the_displayed_unit_prices(): void
    {
        $product = $this->product(['id' => 3, 'sell_price_difference_rial' => 500_000]);
        $price = ProductPrice::create([
            'product_id' => $product->id,
            'raw_price_rial' => '40000000',
            'pricing_mode' => PricingMode::Manual,
            'effective_at' => now()->utc(),
        ]);

        $payload = (new PriceUpdated($price, null, '40000000', '39500000'))->broadcastWith();

        $this->assertSame('40000000', $payload['buy_price_rial']);
        $this->assertSame('39500000', $payload['sell_price_rial']);
        $this->assertArrayNotHasKey('requires_customer_price_refresh', $payload);
    }

    public function test_unauthorized_user_cannot_write_a_price(): void
    {
        Event::fake([PriceUpdated::class]);
        $product = $this->product();
        Sanctum::actingAs($this->customer());

        $this->postJson("/api/v1/admin/products/{$product->id}/prices", [
            'raw_price_rial' => '75000000',
        ])->assertForbidden();

        $this->assertDatabaseMissing('product_prices', ['product_id' => $product->id]);
        Event::assertNotDispatched(PriceUpdated::class);
    }
}
