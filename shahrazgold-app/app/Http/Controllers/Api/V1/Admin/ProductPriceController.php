<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ManualPriceRequest;
use App\Http\Resources\ProductPriceResource;
use App\Models\Product;
use App\Services\Pricing\ProductPricingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProductPriceController extends Controller
{
    public function index(Request $request, Product $product): JsonResponse
    {
        $p = $product->prices()->orderByDesc('effective_at')->orderByDesc('id')->paginate(min($request->integer('per_page', 15), 100));

        return $this->paginated($p, fn ($x) => (new ProductPriceResource($x))->resolve());
    }

    public function current(Product $product): JsonResponse
    {
        $p = $product->currentPrice()->first();

        return $this->success($p ? (new ProductPriceResource($p))->resolve() : null);
    }

    public function store(ManualPriceRequest $request, Product $product, ProductPricingService $service): JsonResponse
    {
        $p = $service->createManualPrice($product, (string) $request->raw_price_rial, $request->user()->id);

        return $this->success((new ProductPriceResource($p))->resolve(), 'Price created.', 201);
    }
}
