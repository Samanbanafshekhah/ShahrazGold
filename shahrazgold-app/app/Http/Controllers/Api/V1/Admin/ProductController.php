<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\PricingMode;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\PriceStepRequest;
use App\Http\Requests\Admin\ProductRequest;
use App\Http\Resources\ProductResource;
use App\Models\MarketPriceSource;
use App\Models\Product;
use App\Services\AuditService;
use App\Services\Pricing\PriceFormulaRegistry;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ProductController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $q = Product::with(['category', 'currentPrice']);
        $q->when($request->filled('search'), fn ($x) => $x->where(fn ($s) => $s->whereLike('name', '%'.$request->search.'%')->orWhereLike('symbol', '%'.$request->search.'%')))
            ->when($request->filled('category_id'), fn ($x) => $x->where('product_category_id', $request->category_id))->when($request->has('is_active'), fn ($x) => $x->where('is_active', $request->boolean('is_active')))
            ->when($request->has('is_buyable'), fn ($x) => $x->where('is_buyable', $request->boolean('is_buyable')))->when($request->has('is_sellable'), fn ($x) => $x->where('is_sellable', $request->boolean('is_sellable')))
            ->when($request->filled('pricing_mode'), fn ($x) => $x->where('pricing_mode', $request->pricing_mode))->orderBy('created_at', $request->input('sort') === 'oldest' ? 'asc' : 'desc');

        return $this->paginated($q->paginate(min($request->integer('per_page', 15), 100)), fn ($p) => (new ProductResource($p))->resolve($request));
    }

    public function store(ProductRequest $request, PriceFormulaRegistry $registry, AuditService $audit): JsonResponse
    {
        $data = $this->payload($request);
        $this->assertFormulaSource($data, $registry);
        $p = Product::create($data);
        $audit->record('product.created', $p, null, $p->toArray());

        return $this->success((new ProductResource($p->load(['category', 'currentPrice'])))->resolve($request), 'Product created.', 201);
    }

    public function show(Request $request, Product $product): JsonResponse
    {
        return $this->success((new ProductResource($product->load(['category', 'currentPrice'])))->resolve($request));
    }

    public function update(ProductRequest $request, Product $product, PriceFormulaRegistry $registry, AuditService $audit): JsonResponse
    {
        $data = $this->payload($request);
        $this->assertFormulaSource($data, $registry);
        $old = $product->toArray();
        $product->update($data);
        $audit->record('product.updated', $product, $old, $product->fresh()->toArray());

        return $this->success((new ProductResource($product->fresh()->load(['category', 'currentPrice'])))->resolve($request), 'Product updated.');
    }

    public function updatePriceStep(PriceStepRequest $request, Product $product, AuditService $audit): JsonResponse
    {
        $old = $product->toArray();
        $product->update($request->validated());
        $audit->record('product.price_step_updated', $product, $old, $product->fresh()->toArray());

        return $this->success(
            (new ProductResource($product->fresh()->load(['category', 'currentPrice'])))->resolve($request),
            'Product price step updated.'
        );
    }

    public function destroy(Product $product): JsonResponse
    {
        $product->delete();

        return $this->success(null, 'Product deleted.');
    }

    private function payload(ProductRequest $request): array
    {
        $d = $request->safe()->except('image');
        $d['slug'] = $d['slug'] ?? Str::slug($d['name']);
        if ($d['pricing_mode'] === PricingMode::Manual->value) {
            $d['price_source_id'] = null;
            $d['pricing_formula_key'] = null;
        }if ($request->hasFile('image')) {
            $d['image_path'] = $request->file('image')->store('products', 'public');
        }

        return $d;
    }

    private function assertFormulaSource(array $data, PriceFormulaRegistry $registry): void
    {
        if ($data['pricing_mode'] !== PricingMode::Derived->value) {
            return;
        }$formula = $registry->get($data['pricing_formula_key']);
        $source = MarketPriceSource::findOrFail($data['price_source_id']);
        abort_unless($formula->sourceCode() === $source->code, 409, 'Pricing formula is incompatible with the selected source.');
    }
}
