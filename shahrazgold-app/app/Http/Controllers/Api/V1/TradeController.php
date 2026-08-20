<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\EntryMode;
use App\Enums\TradeType;
use App\Http\Controllers\Controller;
use App\Http\Requests\TradeRequest;
use App\Models\Product;
use App\Services\Pricing\TradePriceCalculator;
use Illuminate\Http\JsonResponse;

class TradeController extends Controller
{
    public function preview(TradeRequest $request, TradePriceCalculator $calculator): JsonResponse
    {
        $product = Product::with('currentPrice')->findOrFail($request->integer('product_id'));
        abort_if(! $product->currentPrice, 409, 'PRICE_UNAVAILABLE');
        $type = TradeType::from($request->trade_type);
        abort_if($type === TradeType::CustomerBuy && $request->user() && ! $request->user()->canBuyProduct($product->id), 403, 'PRODUCT_ACCESS_DENIED');
        $mode = EntryMode::from($request->entry_mode);
        $result = $calculator->calculate($product, $product->currentPrice, $type, $mode, $request->input('quantity'), $request->input('amount_rial'), $request->user());
        $result = array_merge($result, ['product' => ['id' => $product->id, 'name' => $product->name, 'symbol' => $product->symbol, 'unit' => $product->unit->value], 'trade_type' => $type->value, 'entry_mode' => $mode->value]);

        return $this->success($result, 'Preview calculated.');
    }
}
