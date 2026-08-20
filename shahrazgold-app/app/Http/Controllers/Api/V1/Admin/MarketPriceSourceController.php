<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\QuoteRequest;
use App\Models\MarketPriceSource;
use App\Services\Pricing\ProductPricingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MarketPriceSourceController extends Controller
{
    public function index(): JsonResponse
    {
        return $this->success(MarketPriceSource::with('currentQuote')->orderBy('id')->get()->map(fn ($s) => $this->source($s)));
    }

    public function quotes(Request $request, MarketPriceSource $source): JsonResponse
    {
        $p = $source->quotes()->orderByDesc('effective_at')->orderByDesc('id')->paginate(min($request->integer('per_page', 15), 100));

        return $this->paginated($p, fn ($q) => $this->quote($q));
    }

    public function current(MarketPriceSource $source): JsonResponse
    {
        $q = $source->currentQuote()->first();

        return $this->success($q ? $this->quote($q) : null);
    }

    public function store(QuoteRequest $request, MarketPriceSource $source, ProductPricingService $service): JsonResponse
    {
        $q = $service->createQuote($source, (string) $request->price_rial, $request->note, $request->user()->id);

        return $this->success($this->quote($q), 'Quote created.', 201);
    }

    private function source($s): array
    {
        return ['id' => $s->id, 'code' => $s->code, 'title' => $s->title, 'unit' => $s->unit->value, 'is_active' => $s->is_active, 'current_quote' => $s->currentQuote ? $this->quote($s->currentQuote) : null];
    }

    private function quote($q): array
    {
        return ['id' => $q->id, 'source_id' => $q->market_price_source_id, 'price_rial' => (string) $q->price_rial, 'note' => $q->note, 'effective_at' => $q->effective_at->utc()->toIso8601String(), 'created_at' => $q->created_at->utc()->toIso8601String()];
    }
}
