<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\ProductPriceResource;
use App\Http\Resources\PurchaseRequestResource;
use App\Models\ProductPrice;
use App\Models\PurchaseRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReportController extends Controller
{
    public function purchaseRequests(Request $r): JsonResponse
    {
        $q = PurchaseRequest::with('user')->when($r->filled('date_from'), fn ($x) => $x->whereDate('created_at', '>=', $r->date_from))->when($r->filled('date_to'), fn ($x) => $x->whereDate('created_at', '<=', $r->date_to))->when($r->filled('status'), fn ($x) => $x->where('status', $r->status))->when($r->filled('trade_type'), fn ($x) => $x->where('trade_type', $r->trade_type))->orderByDesc('id');
        $p = $q->paginate(min($r->integer('per_page', 25), 100));

        return $this->paginated($p, fn ($x) => (new PurchaseRequestResource($x))->resolve());
    }

    public function priceHistory(Request $r): JsonResponse
    {
        $q = ProductPrice::query()->with('product')->when($r->filled('product_id'), fn ($x) => $x->where('product_id', $r->product_id))->when($r->filled('date_from'), fn ($x) => $x->whereDate('effective_at', '>=', $r->date_from))->when($r->filled('date_to'), fn ($x) => $x->whereDate('effective_at', '<=', $r->date_to))->orderByDesc('effective_at')->orderByDesc('id');
        $p = $q->paginate(min($r->integer('per_page', 25), 100));

        return $this->paginated($p, fn ($x) => (new ProductPriceResource($x))->resolve());
    }
}
