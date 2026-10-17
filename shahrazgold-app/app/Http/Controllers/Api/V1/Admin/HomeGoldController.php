<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\PricingMode;
use App\Exceptions\HomeGoldException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\HomeGoldBindingRequest;
use App\Models\HomeGoldBinding;
use App\Models\Product;
use App\Services\AuditService;
use App\Services\HomeGoldPricingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class HomeGoldController extends Controller
{
    public function index(HomeGoldPricingService $service): JsonResponse
    {
        $products = Product::with(['currentPrice', 'homeGoldBinding'])->orderBy('display_order')->orderBy('id')->get();

        return $this->success([
            'configured' => filled(config('services.homegold.client_id')) && filled(config('services.homegold.client_secret')),
            'feed' => $service->feed(),
            'products' => $products->map(fn ($product) => [
                'id' => $product->id, 'name' => $product->name, 'unit' => $product->unit->value,
                'pricing_mode' => $product->pricing_mode->value, 'is_active' => $product->is_active,
                'current_buy_rial' => $product->currentPrice?->raw_price_rial,
                'current_sell_rial' => $product->currentPrice ? bcsub((string) $product->currentPrice->raw_price_rial, $product->sellDifferenceFor($product->currentPrice), 0) : null,
                'binding' => $product->homeGoldBinding ? array_replace(
                    $product->homeGoldBinding->toArray(), HomeGoldBinding::FIXED_SETTINGS,
                    ['mode' => $product->homeGoldBinding->mode === 'auto' ? 'auto' : 'disabled'],
                ) : null,
                'stale' => $product->homeGoldBinding?->isStale() ?? false,
            ]),
        ]);
    }

    public function preview(HomeGoldBindingRequest $request, Product $product, HomeGoldPricingService $service): JsonResponse
    {
        return $this->success($this->validatedPreview($request->validated(), $service));
    }

    public function update(HomeGoldBindingRequest $request, Product $product, HomeGoldPricingService $service, AuditService $audit): JsonResponse
    {
        $data = $request->validated();
        if ($data['mode'] !== 'disabled') {
            $this->validatedPreview($data, $service);
        }
        $binding = DB::transaction(function () use ($request, $product, $data, $audit) {
            $locked = Product::lockForUpdate()->findOrFail($product->id);
            abort_if($data['mode'] === 'auto' && $locked->pricing_mode !== PricingMode::Manual, 422, 'برای اتصال خودکار، روش قیمت‌گذاری محصول باید دستی باشد.');
            $binding = HomeGoldBinding::firstOrNew(['product_id' => $locked->id]);
            $old = $binding->exists ? $binding->toArray() : null;
            $binding->fill($data);
            if ($binding->isDirty()) {
                $binding->last_success_at = null;
                $binding->last_attempt_at = null;
                $binding->last_quote = null;
                $binding->last_error = null;
            }
            $binding->updated_by = $request->user()->id;
            $binding->save();
            $audit->record('homegold.binding_updated', $binding, $old, $binding->toArray());

            return $binding;
        }, 3);

        return $this->success($binding, 'تنظیمات اتصال ذخیره شد.');
    }

    public function refresh(HomeGoldPricingService $service): JsonResponse
    {
        return $this->success($service->refresh(), 'قیمت‌های هوم‌گلد دریافت شدند.');
    }

    private function validatedPreview(array $settings, HomeGoldPricingService $service): array
    {
        $feed = $service->feed() ?? $service->fetch();
        try {
            return $service->preview($settings, $feed);
        } catch (HomeGoldException $exception) {
            throw ValidationException::withMessages(['price_adjustment' => $exception->getMessage()]);
        }
    }

    public function apply(Product $product, HomeGoldPricingService $service): JsonResponse
    {
        abort_unless($product->homeGoldBinding?->mode === 'auto', 409, 'ابتدا حالت خودکار را ذخیره کنید.');

        return $this->success($service->refresh($product->id), 'دریافت و بررسی قیمت انجام شد.');
    }
}
