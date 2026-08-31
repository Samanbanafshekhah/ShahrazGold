<?php

namespace Tests\Feature;

use App\Events\PriceUpdated;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Laravel\Sanctum\Sanctum;
use Tests\CreatesDomain;
use Tests\TestCase;

class CatalogAndPricingTest extends TestCase
{
    use CreatesDomain,RefreshDatabase;

    public function test_admin_category_and_product_crud_uniqueness_soft_delete_and_public_filter(): void
    {
        Sanctum::actingAs($this->admin());
        $category = $this->postJson('/api/v1/admin/categories', ['title' => 'طلا', 'slug' => 'gold', 'display_order' => 0])->assertCreated()->json('data');
        $payload = ['product_category_id' => $category['id'], 'name' => 'محصول', 'slug' => 'sample', 'symbol' => 'SAMPLE', 'unit' => 'gram', 'pricing_mode' => 'manual', 'trade_adjustment_enabled' => false, 'trade_adjustment_percent' => '0'];
        $this->postJson('/api/v1/admin/products', $payload)->assertCreated();
        $this->postJson('/api/v1/admin/products', $payload)->assertStatus(422);
        $inactive = $this->product(['product_category_id' => $category['id'], 'is_active' => false]);
        $this->getJson('/api/v1/products')->assertJsonMissing(['id' => $inactive->id]);
        $this->getJson('/api/v1/admin/products?pricing_mode=manual&search=SAMPLE&per_page=1')->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('meta.per_page', 1);
        $this->deleteJson('/api/v1/admin/products/1')->assertOk();
        $this->assertSoftDeleted('products', ['id' => 1]);
    }

    public function test_quote_creates_immutable_derived_history_snapshot_and_public_raw_price(): void
    {
        Event::fake([PriceUpdated::class]);
        $admin = $this->admin();
        $source = $this->source();
        $product = $this->derivedProduct($source);
        Sanctum::actingAs($admin);
        $this->postJson("/api/v1/admin/price-sources/{$source->id}/quotes", ['price_rial' => '300000000', 'note' => 'first'])->assertCreated();
        $this->postJson("/api/v1/admin/price-sources/{$source->id}/quotes", ['price_rial' => '305000000'])->assertCreated();
        $this->assertSame(2, $product->prices()->count());
        $first = $product->prices()->oldest('id')->first();
        $this->assertSame('69255275', (string) $first->raw_price_rial);
        $this->assertSame('4.3318', $first->formula_parameters['divisor']);
        $this->getJson('/api/v1/products/gold-18')->assertOk()->assertJsonPath('data.current_price.raw_price_rial', (string) $product->currentPrice()->first()->raw_price_rial)->assertJsonMissingPath('data.current_price.adjusted_price_rial');
        Event::assertDispatchedTimes(PriceUpdated::class, 2);
    }

    public function test_manual_price_only_manual_and_product_without_price_is_safe(): void
    {
        $admin = $this->admin();
        $manual = $this->product();
        $derived = $this->derivedProduct();
        Sanctum::actingAs($admin);
        $this->postJson("/api/v1/admin/products/{$manual->id}/prices", ['raw_price_rial' => '90000000'])->assertCreated();
        $this->getJson("/api/v1/admin/products/{$manual->id}")
            ->assertOk()
            ->assertJsonPath('data.current_price.buy_price_rial', '90000000')
            ->assertJsonPath('data.current_price.sell_price_rial', '90000000')
            ->assertJsonPath('data.final_amount_multiplier', '1.01');
        $this->postJson("/api/v1/admin/products/{$derived->id}/prices", ['raw_price_rial' => '90000000'])->assertStatus(409);
        $empty = $this->product(['slug' => 'no-price', 'symbol' => 'NOPRICE']);
        $this->getJson('/api/v1/products/no-price')->assertOk()->assertJsonPath('data.current_price', null)->assertJsonPath('data.is_price_available', false);
    }

    public function test_active_category_with_active_product_cannot_be_deleted(): void
    {
        $admin = $this->admin();
        $category = $this->category();
        $this->product(['product_category_id' => $category->id]);
        Sanctum::actingAs($admin);
        $this->deleteJson('/api/v1/admin/categories/'.$category->id)->assertStatus(409);
    }

    public function test_admin_can_set_a_persistent_price_step_per_product(): void
    {
        $product = $this->product();
        $otherProduct = $this->product();
        Sanctum::actingAs($this->admin());

        $this->getJson("/api/v1/admin/products/{$product->id}")
            ->assertOk()
            ->assertJsonPath('data.price_step_rial', '10000');

        $this->patchJson("/api/v1/admin/products/{$product->id}/price-step", [
            'price_step_rial' => 500_000,
        ])->assertOk()->assertJsonPath('data.price_step_rial', '500000');

        $this->assertDatabaseHas('products', ['id' => $product->id, 'price_step_rial' => 500_000]);
        $this->assertDatabaseHas('products', ['id' => $otherProduct->id, 'price_step_rial' => 10_000]);
    }

    public function test_admin_can_persist_buy_and_sell_availability_independently(): void
    {
        $product = $this->product();
        Sanctum::actingAs($this->admin());

        $this->getJson("/api/v1/admin/products/{$product->id}")
            ->assertOk()
            ->assertJsonPath('data.buy_disabled', false)
            ->assertJsonPath('data.sell_disabled', false);

        $this->patchJson("/api/v1/admin/products/{$product->id}/trade-availability", [
            'buy_disabled' => true,
        ])
            ->assertOk()
            ->assertJsonPath('data.buy_disabled', true)
            ->assertJsonPath('data.sell_disabled', false);

        $this->patchJson("/api/v1/admin/products/{$product->id}/trade-availability", [
            'sell_disabled' => true,
        ])
            ->assertOk()
            ->assertJsonPath('data.buy_disabled', true)
            ->assertJsonPath('data.sell_disabled', true);

        $this->assertDatabaseHas('products', [
            'id' => $product->id,
            'buy_disabled' => true,
            'sell_disabled' => true,
        ]);

        $this->getJson("/api/v1/admin/products/{$product->id}")
            ->assertOk()
            ->assertJsonPath('data.buy_disabled', true)
            ->assertJsonPath('data.sell_disabled', true);

        $this->patchJson("/api/v1/admin/products/{$product->id}/trade-availability", [
            'buy_disabled' => false,
        ])
            ->assertOk()
            ->assertJsonPath('data.buy_disabled', false)
            ->assertJsonPath('data.sell_disabled', true);

        $this->patchJson("/api/v1/admin/products/{$product->id}/trade-availability", [])
            ->assertUnprocessable();
    }
}
