<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\Role;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Collection;
use Laravel\Sanctum\Sanctum;
use Tests\CreatesDomain;
use Tests\TestCase;

class ProductOrderingTest extends TestCase
{
    use CreatesDomain, RefreshDatabase;

    public function test_authorized_mobile_can_save_the_global_product_order_for_every_user(): void
    {
        [$products, $role] = $this->visibleProductsWithCustomerRole();
        $manager = $this->customer([
            'mobile' => '09122853808',
            'role_id' => $role->id,
        ]);

        Sanctum::actingAs($manager);

        $this->getJson('/api/v1/auth/me')
            ->assertOk()
            ->assertJsonPath('data.can_reorder_products', true);

        $this->getJson('/api/v1/products?per_page=100')
            ->assertOk()
            ->assertJsonPath('data.0.id', $products[0]->id)
            ->assertJsonPath('data.1.id', $products[1]->id)
            ->assertJsonPath('data.2.id', $products[2]->id);

        $newOrder = [$products[2]->id, $products[0]->id, $products[1]->id];
        $this->patchJson('/api/v1/products/reorder', ['product_ids' => $newOrder])
            ->assertOk()
            ->assertJsonPath('data.product_ids', $newOrder);

        foreach ($newOrder as $index => $productId) {
            $this->assertDatabaseHas('products', [
                'id' => $productId,
                'display_order' => $index + 1,
            ]);
        }

        $normalUser = $this->customer([
            'mobile' => '09120000000',
            'role_id' => $role->id,
        ]);
        Sanctum::actingAs($normalUser);

        $this->getJson('/api/v1/auth/me')
            ->assertOk()
            ->assertJsonPath('data.can_reorder_products', false);
        $this->getJson('/api/v1/products?per_page=100')
            ->assertOk()
            ->assertJsonPath('data.0.id', $newOrder[0])
            ->assertJsonPath('data.1.id', $newOrder[1])
            ->assertJsonPath('data.2.id', $newOrder[2]);
        $this->patchJson('/api/v1/products/reorder', [
            'product_ids' => array_reverse($newOrder),
        ])->assertForbidden();
    }

    public function test_reorder_requires_authentication_and_a_complete_unique_valid_order(): void
    {
        [$products, $role] = $this->visibleProductsWithCustomerRole();
        $originalOrder = $products->pluck('id')->all();

        $this->patchJson('/api/v1/products/reorder', [
            'product_ids' => $originalOrder,
        ])->assertUnauthorized();

        Sanctum::actingAs($this->customer([
            'mobile' => '09122853808',
            'role_id' => $role->id,
        ]));

        $this->patchJson('/api/v1/products/reorder', [
            'product_ids' => [$products[0]->id, $products[0]->id, $products[2]->id],
        ])->assertUnprocessable()->assertJsonValidationErrors('product_ids.1');

        $this->patchJson('/api/v1/products/reorder', [
            'product_ids' => [$products[0]->id, $products[1]->id, 999999],
        ])->assertUnprocessable()->assertJsonValidationErrors('product_ids.2');

        $this->patchJson('/api/v1/products/reorder', [
            'product_ids' => [$products[0]->id, $products[1]->id],
        ])->assertUnprocessable()->assertJsonValidationErrors('product_ids');

        $this->assertSame(
            $originalOrder,
            Product::query()->orderBy('display_order')->orderBy('id')->pluck('id')->all(),
        );
    }

    public function test_user_id_one_fallback_only_works_in_local_environment(): void
    {
        [$products, $role] = $this->visibleProductsWithCustomerRole();
        $user = $this->customer([
            'id' => 1,
            'mobile' => '09121111111',
            'role_id' => $role->id,
        ]);
        $newOrder = [$products[1]->id, $products[2]->id, $products[0]->id];
        Sanctum::actingAs($user);

        $this->patchJson('/api/v1/products/reorder', [
            'product_ids' => $newOrder,
        ])->assertForbidden();

        $this->app->detectEnvironment(fn () => 'local');

        $this->getJson('/api/v1/auth/me')
            ->assertOk()
            ->assertJsonPath('data.can_reorder_products', true);
        $this->patchJson('/api/v1/products/reorder', [
            'product_ids' => $newOrder,
        ])->assertOk();
    }

    /**
     * @return array{0: Collection<int, Product>, 1: Role}
     */
    private function visibleProductsWithCustomerRole(): array
    {
        $category = $this->category();
        $products = collect([
            $this->product(['product_category_id' => $category->id, 'display_order' => 10]),
            $this->product(['product_category_id' => $category->id, 'display_order' => 20]),
            $this->product(['product_category_id' => $category->id, 'display_order' => 30]),
        ]);
        $role = Role::query()->where('slug', 'customer')->firstOrFail();

        foreach ($products as $product) {
            $role->products()->attach($product->id, [
                'can_access' => true,
                'can_buy' => true,
            ]);
        }

        return [$products, $role];
    }
}
