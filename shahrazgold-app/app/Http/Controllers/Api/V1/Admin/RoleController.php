<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Events\PriceUpdated;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\RolePriceAdjustmentRequest;
use App\Http\Requests\Admin\RoleRequest;
use App\Http\Resources\RoleResource;
use App\Models\Product;
use App\Models\Role;
use App\Services\AuditService;
use App\Services\Pricing\DecimalMath;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class RoleController extends Controller
{
    public function index(): JsonResponse
    {
        return $this->success(RoleResource::collection(Role::withCount('users')->with('products')->orderBy('id')->get())->resolve());
    }

    public function show(Role $role): JsonResponse
    {
        return $this->success((new RoleResource($role->load('products')->loadCount('users')))->resolve());
    }

    public function store(RoleRequest $request, AuditService $audit): JsonResponse
    {
        return $this->save($request, new Role, $audit, true);
    }

    public function update(RoleRequest $request, Role $role, AuditService $audit): JsonResponse
    {
        return $this->save($request, $role, $audit, false);
    }

    public function destroy(Role $role): JsonResponse
    {
        abort_if(in_array($role->slug, ['admin', 'customer'], true) || $role->users()->exists(), 409, 'این نقش قابل حذف نیست.');
        $role->delete();

        return $this->success(null, 'Role deleted.');
    }

    public function priceAdjustments(Role $role): JsonResponse
    {
        return $this->success($this->priceAdjustmentData($role));
    }

    public function updatePriceAdjustments(RolePriceAdjustmentRequest $request, Role $role, AuditService $audit): JsonResponse
    {
        $products = Product::with('currentPrice')->whereIn('id', collect($request->validated('adjustments'))->pluck('product_id'))->get()->keyBy('id');
        $old = $this->priceAdjustmentData($role);

        DB::transaction(function () use ($request, $role, $products) {
            foreach ($request->validated('adjustments') as $index => $adjustment) {
                $product = $products->get($adjustment['product_id']);
                if ($product?->currentPrice) {
                    $raw = (string) $product->currentPrice->raw_price_rial;
                    $normalSell = DecimalMath::sub($raw, (string) $product->sell_price_difference_rial, 0);
                    $buy = DecimalMath::add($raw, (string) $adjustment['buy_price_adjustment_rial'], 0);
                    $sell = DecimalMath::add($normalSell, (string) $adjustment['sell_price_adjustment_rial'], 0);
                    if (bccomp($buy, '0', 0) <= 0 || bccomp($sell, '0', 0) <= 0) {
                        throw ValidationException::withMessages([
                            "adjustments.$index" => 'قیمت نهایی خرید و فروش باید بزرگ‌تر از صفر باشد.',
                        ]);
                    }
                }

                $role->products()->syncWithoutDetaching([
                    $adjustment['product_id'] => [
                        'buy_price_adjustment_rial' => $adjustment['buy_price_adjustment_rial'],
                        'sell_price_adjustment_rial' => $adjustment['sell_price_adjustment_rial'],
                    ],
                ]);
                DB::table('role_product_permissions')
                    ->where('role_id', $role->id)
                    ->where('product_id', $adjustment['product_id'])
                    ->increment('price_version');
            }
        });

        $new = $this->priceAdjustmentData($role);
        $audit->record('role.price_adjustments_updated', $role, $old, $new);

        collect($new['products'])
            ->whereIn('product_id', collect($request->validated('adjustments'))->pluck('product_id'))
            ->each(function (array $price) use ($products, $role): void {
                $currentPrice = $products->get($price['product_id'])?->currentPrice;
                if ($currentPrice) {
                    PriceUpdated::dispatch(
                        $currentPrice,
                        $role->id,
                        $price['role_buy_price_rial'],
                        $price['role_sell_price_rial'],
                    );
                }
            });

        return $this->success($new, 'Role price adjustments updated.');
    }

    private function save(RoleRequest $request, Role $role, AuditService $audit, bool $creating): JsonResponse
    {
        $data = $request->safe()->except('permissions');
        $old = $creating ? null : $role->toArray();
        DB::transaction(function () use ($request, $role, $data) {
            $role->fill($data)->save();
            if ($request->has('permissions')) {
                $sync = [];
                foreach ($request->input('permissions', []) as $p) {
                    $sync[$p['product_id']] = ['can_access' => (bool) ($p['can_access'] ?? false), 'can_buy' => (bool) ($p['can_buy'] ?? false)];
                } $role->products()->sync($sync);
            }
        });
        $audit->record($creating ? 'role.created' : 'role.updated', $role, $old, $role->fresh()->toArray());

        return $this->success((new RoleResource($role->fresh()->load('products')->loadCount('users')))->resolve(), $creating ? 'Role created.' : 'Role updated.', $creating ? 201 : 200);
    }

    private function priceAdjustmentData(Role $role): array
    {
        $role->load('products');
        $pivots = $role->products->keyBy('id');

        return [
            'role' => ['id' => $role->id, 'name' => $role->name, 'slug' => $role->slug],
            'products' => Product::with('currentPrice')->orderBy('display_order')->orderBy('id')->get()->map(function (Product $product) use ($pivots) {
                $pivot = $pivots->get($product->id)?->pivot;
                $raw = $product->currentPrice ? (string) $product->currentPrice->raw_price_rial : null;
                $normalSell = $raw ? DecimalMath::sub($raw, (string) $product->sell_price_difference_rial, 0) : null;
                $buyAdjustment = (string) ($pivot?->buy_price_adjustment_rial ?? 0);
                $sellAdjustment = (string) ($pivot?->sell_price_adjustment_rial ?? 0);

                return [
                    'product_id' => $product->id,
                    'name' => $product->name,
                    'symbol' => $product->symbol,
                    'unit' => $product->unit->value,
                    'normal_buy_price_rial' => $raw,
                    'normal_sell_price_rial' => $normalSell,
                    'buy_price_adjustment_rial' => $buyAdjustment,
                    'sell_price_adjustment_rial' => $sellAdjustment,
                    'role_buy_price_rial' => $raw ? DecimalMath::add($raw, $buyAdjustment, 0) : null,
                    'role_sell_price_rial' => $normalSell ? DecimalMath::add($normalSell, $sellAdjustment, 0) : null,
                ];
            })->values(),
        ];
    }
}
