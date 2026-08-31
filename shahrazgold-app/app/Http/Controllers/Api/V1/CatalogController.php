<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\ProductReorderRequest;
use App\Http\Resources\ProductResource;
use App\Models\Product;
use App\Models\ProductCategory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

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

        return $this
            ->paginated($p, fn ($x) => (new ProductResource($x))->resolve($request))
            ->header('Cache-Control', 'no-store, no-cache, must-revalidate, private')
            ->header('Pragma', 'no-cache');
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
        $products = $this->visibleProducts($request)->orderBy('display_order')->orderBy('id')->get();

        return $this
            ->success($products->map(function ($product) use ($request) {
                $resource = (new ProductResource($product))->resolve($request);

                return [
                    'product_id' => $product->id,
                    'price_id' => $product->currentPrice?->id,
                    'symbol' => $product->symbol,
                    'name' => $product->name,
                    'raw_price_rial' => $resource['current_price']['raw_price_rial'] ?? null,
                    'buy_price_rial' => $resource['current_price']['buy_price_rial'] ?? null,
                    'sell_price_rial' => $resource['current_price']['sell_price_rial'] ?? null,
                    'sell_price_difference_rial' => (string) $product->sell_price_difference_rial,
                    'buy_disabled' => (bool) $product->buy_disabled,
                    'sell_disabled' => (bool) $product->sell_disabled,
                    'price_version' => $resource['price_version'],
                    'price_adjustment_version' => $resource['price_adjustment_version'],
                    'is_price_available' => (bool) $product->currentPrice,
                    'effective_at' => $product->currentPrice?->effective_at->utc()->toIso8601String(),
                ];
            }))
            ->header('Cache-Control', 'no-store, no-cache, must-revalidate, private')
            ->header('Pragma', 'no-cache');
    }

    public function reorder(ProductReorderRequest $request): JsonResponse
    {
        $productIds = array_map('intval', $request->validated('product_ids'));
        $visibleProductIds = $this->visibleProducts($request)
            ->orderBy('display_order')
            ->orderBy('id')
            ->pluck('products.id')
            ->map(fn ($id) => (int) $id)
            ->all();

        if (count($productIds) !== count($visibleProductIds)
            || array_diff($productIds, $visibleProductIds)
            || array_diff($visibleProductIds, $productIds)) {
            throw ValidationException::withMessages([
                'product_ids' => 'The complete visible product order is required.',
            ]);
        }

        DB::transaction(function () use ($productIds): void {
            $products = Product::query()
                ->orderBy('display_order')
                ->orderBy('id')
                ->lockForUpdate()
                ->get(['id', 'display_order']);

            $requestedProducts = array_fill_keys($productIds, true);
            $nextRequestedIndex = 0;
            $globalOrder = $products->pluck('id')->map(fn ($id) => (int) $id)->all();

            foreach ($globalOrder as $index => $productId) {
                if (isset($requestedProducts[$productId])) {
                    $globalOrder[$index] = $productIds[$nextRequestedIndex++];
                }
            }

            abort_unless($nextRequestedIndex === count($productIds), 422, 'INVALID_PRODUCT_ORDER');

            foreach ($globalOrder as $index => $productId) {
                Product::query()->whereKey($productId)->update(['display_order' => $index + 1]);
            }
        }, 3);

        return $this->success(['product_ids' => $productIds], 'Product order updated.');
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
