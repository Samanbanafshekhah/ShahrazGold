<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\ProductResource;
use App\Models\Product;
use App\Models\ProductCategory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CatalogController extends Controller
{
    public function categories(): JsonResponse
    {
        return $this->success(ProductCategory::query()->where('is_active', true)->orderBy('display_order')->orderBy('id')->get()->map(fn ($c) => ['id' => $c->id, 'title' => $c->title, 'slug' => $c->slug, 'description' => $c->description, 'icon' => $c->icon, 'image_url' => $c->image_path ? url('storage/'.$c->image_path) : null]));
    }

    public function products(Request $request): JsonResponse
    {
        $q = Product::with(['category', 'currentPrice'])->where('is_active', true)->whereHas('category', fn ($x) => $x->where('is_active', true))->when($request->filled('category'), fn ($x) => $x->whereHas('category', fn ($c) => $c->where('slug', $request->category)))->when($request->filled('search'), fn ($x) => $x->where(fn ($s) => $s->whereLike('name', '%'.$request->search.'%')->orWhereLike('symbol', '%'.$request->search.'%')))->orderBy('display_order')->orderBy('id');
        $p = $q->paginate(min($request->integer('per_page', 20), 100));

        return $this->paginated($p, fn ($x) => (new ProductResource($x))->resolve($request));
    }

    public function product(Request $request, Product $product): JsonResponse
    {
        abort_unless($product->is_active && $product->category()->where('is_active', true)->exists(), 404);

        return $this->success((new ProductResource($product->load(['category', 'currentPrice'])))->resolve($request));
    }

    public function prices(Request $request): JsonResponse
    {
        $products = Product::with(['category', 'currentPrice'])->where('is_active', true)->whereHas('category', fn ($x) => $x->where('is_active', true))->orderBy('display_order')->get();

        return $this->success($products->map(fn ($p) => ['product_id' => $p->id, 'symbol' => $p->symbol, 'name' => $p->name, 'raw_price_rial' => $p->currentPrice ? (string) $p->currentPrice->raw_price_rial : null, 'is_price_available' => (bool) $p->currentPrice, 'effective_at' => $p->currentPrice?->effective_at->utc()->toIso8601String()]));
    }
}
