<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\ProductResource;
use App\Models\Product;
use App\Models\ProductCategory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class CatalogController extends Controller
{
    public function categories(): JsonResponse
    {
        return $this->success(ProductCategory::query()->where('is_active', true)->orderBy('display_order')->orderBy('id')->get()->map(fn ($c) => ['id' => $c->id, 'title' => $c->title, 'slug' => $c->slug, 'description' => $c->description, 'icon' => $c->icon, 'image_url' => $c->image_path ? url('storage/'.$c->image_path) : null]));
    }

    public function products(Request $request): JsonResponse
    {
        $this->resolveOptionalUser($request);
        $q = $this->visibleProducts($request);
        if ($request->filled('category')) {
            $q->whereHas('category', fn ($category) => $category->where('slug', $request->category));
        }
        if ($request->filled('search')) {
            $term = '%'.$request->search.'%';
            $q->where(fn ($search) => $search->whereLike('name', $term)->orWhereLike('symbol', $term));
        }
        $q->orderBy('display_order')->orderBy('id');
        $p = $q->paginate(min($request->integer('per_page', 20), 100));

        return $this->paginated($p, fn ($x) => (new ProductResource($x))->resolve($request));
    }

    public function product(Request $request, Product $product): JsonResponse
    {
        $this->resolveOptionalUser($request);
        abort_unless($product->is_active && $product->category()->where('is_active', true)->exists() && (! $request->user() || $request->user()->canAccessProduct($product->id)), 404);

        return $this->success((new ProductResource($product->load(['category', 'currentPrice'])))->resolve($request));
    }

    public function prices(Request $request): JsonResponse
    {
        $this->resolveOptionalUser($request);
        $products = $this->visibleProducts($request)->orderBy('display_order')->get();

        return $this->success($products->map(function ($product) use ($request) {
            $resource = (new ProductResource($product))->resolve($request);

            return ['product_id' => $product->id, 'symbol' => $product->symbol, 'name' => $product->name, 'raw_price_rial' => $resource['current_price']['raw_price_rial'] ?? null, 'buy_price_rial' => $resource['current_price']['buy_price_rial'] ?? null, 'sell_price_rial' => $resource['current_price']['sell_price_rial'] ?? null, 'is_price_available' => (bool) $product->currentPrice, 'effective_at' => $product->currentPrice?->effective_at->utc()->toIso8601String()];
        }));
    }

    private function resolveOptionalUser(Request $request): void
    {
        $user = Auth::guard('sanctum')->user();
        if (! $user?->is_active) {
            return;
        }

        $user->loadMissing('accessRole.products');
        $request->setUserResolver(fn () => $user);
    }
    private function visibleProducts(Request $request)
    {
        $query = Product::with(['category', 'currentPrice'])->where('is_active', true)->whereHas('category', fn ($x) => $x->where('is_active', true));
        $user = $request->user();

        if ($user && ! $user->isAdmin()) {
            $query->whereHas('roles', fn ($roles) => $roles->whereKey($user->role_id)->where('roles.is_active', true)->where('role_product_permissions.can_access', true));
        }

        return $query;
    }

}
