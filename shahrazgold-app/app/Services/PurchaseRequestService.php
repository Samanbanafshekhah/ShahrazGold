<?php

namespace App\Services;

use App\Enums\EntryMode;
use App\Enums\ProductUnit;
use App\Enums\PurchaseRequestStatus;
use App\Enums\TradeType;
use App\Events\PurchaseRequestApproved;
use App\Events\PurchaseRequestCreated;
use App\Events\PurchaseRequestRejected;
use App\Exceptions\PriceChangedException;
use App\Models\AppSetting;
use App\Models\Product;
use App\Models\ProductPrice;
use App\Models\PurchaseRequest;
use App\Models\User;
use App\Services\Pricing\DecimalMath;
use App\Services\Pricing\TradePriceCalculator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class PurchaseRequestService
{
    public function __construct(
        private TradePriceCalculator $calculator,
        private AuditService $audit,
        private TradeAvailabilityService $tradeAvailability,
    ) {}

    public function create(User $user, array $input): PurchaseRequest
    {
        return DB::transaction(function () use ($user, $input) {
            $lockedUser = User::query()->lockForUpdate()->findOrFail($user->id);
            $tradeType = TradeType::from($input['trade_type']);
            abort_unless(AppSetting::managerOnline(), 409, 'MANAGER_OFFLINE');
            $existing = PurchaseRequest::query()->where('user_id', $user->id)->where('client_reference', $input['client_reference'])->first();
            if ($existing) {
                return $existing;
            }

            $product = Product::query()->lockForUpdate()->findOrFail($input['product_id']);
            $price = ProductPrice::query()->where('product_id', $product->id)
                ->orderByDesc('effective_at')->orderByDesc('id')->lockForUpdate()->first();
            abort_if(! $price, 409, 'PRICE_UNAVAILABLE');
            $entryMode = EntryMode::from($input['entry_mode']);
            abort_unless($product->is_active, 409, 'این محصول غیرفعال است.');
            abort_if($tradeType === TradeType::CustomerBuy && ! $lockedUser->canBuyProduct($product->id), 403, 'PRODUCT_ACCESS_DENIED');
            abort_if($tradeType === TradeType::CustomerBuy && ! $product->is_buyable, 409, 'خرید این محصول در حال حاضر امکان‌پذیر نیست.');
            abort_if($tradeType === TradeType::CustomerSell && ! $product->is_sellable, 409, 'فروش این محصول در حال حاضر امکان‌پذیر نیست.');
            $this->tradeAvailability->ensureOpen($product, $tradeType);
            $calculation = $this->calculator->calculate($product, $price, $tradeType, $entryMode, $input['quantity'] ?? null, $input['amount_rial'] ?? null, $lockedUser);

            if ((int) $input['expected_product_price_id'] !== $price->id) {
                throw new PriceChangedException($this->previewPayload($product, $tradeType, $entryMode, $calculation));
            }

            if ($tradeType === TradeType::CustomerBuy) {
                $this->ensureQuantityPurchaseLimit($lockedUser, $product, $calculation['quantity']);
            }

            $request = PurchaseRequest::query()->create([
                'request_number' => 'SG-'.now()->utc()->format('YmdHis').'-'.strtoupper(Str::random(8)),
                'client_reference' => $input['client_reference'], 'user_id' => $user->id,
                'product_id' => $product->id, 'product_price_id' => $price->id,
                'trade_type' => $tradeType, 'entry_mode' => $entryMode,
                'requested_quantity' => $entryMode === EntryMode::Quantity ? $input['quantity'] : null,
                'requested_amount_rial' => $entryMode === EntryMode::Amount ? $input['amount_rial'] : null,
                'calculated_quantity' => $calculation['quantity'],
                'raw_unit_price_rial' => $calculation['raw_unit_price_rial'],
                'trade_adjustment_enabled' => $product->trade_adjustment_enabled,
                'trade_adjustment_percent' => $calculation['adjustment_percent'],
                'adjustment_amount_per_unit_rial' => $calculation['adjustment_amount_rial'],
                'role_price_adjustment_rial' => $calculation['role_price_adjustment_rial'],
                'final_unit_price_rial' => $calculation['final_unit_price_rial'],
                'total_amount_rial' => $calculation['total_amount_rial'],
                'product_name' => $product->name, 'product_symbol' => $product->symbol, 'product_unit' => $product->unit->value,
                'status' => PurchaseRequestStatus::Pending, 'user_note' => $input['user_note'] ?? null,
                'price_effective_at' => $price->effective_at,
            ]);
            PurchaseRequestCreated::dispatch($request);

            return $request;
        }, 3);
    }

    public function transition(PurchaseRequest $request, PurchaseRequestStatus $to, User $actor, ?string $note = null): PurchaseRequest
    {
        return DB::transaction(function () use ($request, $to, $actor, $note) {
            $locked = PurchaseRequest::query()->lockForUpdate()->findOrFail($request->id);
            $from = $locked->status;
            $allowed = match ($from) {
                PurchaseRequestStatus::Pending => [PurchaseRequestStatus::Approved, PurchaseRequestStatus::Rejected, PurchaseRequestStatus::Cancelled],
                PurchaseRequestStatus::Approved => [PurchaseRequestStatus::Completed],
                default => [],
            };
            abort_unless(in_array($to, $allowed, true), 409, 'تغییر وضعیت درخواست مجاز نیست.');
            if ($to === PurchaseRequestStatus::Cancelled) {
                abort_unless($locked->user_id === $actor->id, 403);
            }

            $changes = ['status' => $to, 'admin_note' => $to === PurchaseRequestStatus::Cancelled ? $locked->admin_note : ($note ?? $locked->admin_note)];
            if ($to === PurchaseRequestStatus::Approved) {
                $changes += ['approved_by' => $actor->id, 'approved_at' => now()->utc()];
            }
            if ($to === PurchaseRequestStatus::Rejected) {
                $changes += ['rejected_by' => $actor->id, 'rejected_at' => now()->utc()];
            }
            if ($to === PurchaseRequestStatus::Completed) {
                $changes += ['completed_by' => $actor->id, 'completed_at' => now()->utc()];
            }
            $locked->forceFill($changes)->save();
            $locked->histories()->create(['from_status' => $from, 'to_status' => $to, 'changed_by' => $actor->id, 'note' => $note]);

            if ($to === PurchaseRequestStatus::Approved) {
                PurchaseRequestApproved::dispatch($locked);
            }
            if ($to === PurchaseRequestStatus::Rejected) {
                PurchaseRequestRejected::dispatch($locked);
            }
            if ($to !== PurchaseRequestStatus::Cancelled) {
                $this->audit->record('purchase_request.'.$to->value, $locked, ['status' => $from->value], ['status' => $to->value], $actor->id);
            }

            return $locked->refresh();
        }, 3);
    }

    private function previewPayload(Product $product, TradeType $tradeType, EntryMode $entryMode, array $calculation): array
    {
        return array_merge($calculation, ['product' => ['id' => $product->id, 'name' => $product->name, 'symbol' => $product->symbol, 'unit' => $product->unit->value], 'trade_type' => $tradeType->value, 'entry_mode' => $entryMode->value]);
    }

    public function quantityPurchaseLimitSummary(User $user): array
    {
        $used = ['grams' => '0', 'count' => '0'];
        $totals = $user->purchaseRequests()
            ->where('trade_type', TradeType::CustomerBuy->value)
            ->whereIn('status', ['pending', 'approved', 'completed'])
            ->selectRaw('product_unit, SUM(calculated_quantity) as quantity_used')
            ->groupBy('product_unit')->get();
        foreach ($totals as $total) {
            $key = $total->product_unit === ProductUnit::Count->value ? 'count' : 'grams';
            $quantity = (string) $total->quantity_used;
            if ($total->product_unit === ProductUnit::Mithqal->value) {
                $quantity = DecimalMath::mul($quantity, '4.6083', 6);
            }
            $used[$key] = DecimalMath::add($used[$key], $quantity, 6);
        }

        $summary = [];
        foreach (['grams', 'count'] as $key) {
            $limit = $user->getAttribute('purchase_limit_'.$key);
            $remaining = $limit === null ? null : DecimalMath::sub((string) $limit, $used[$key], 6);
            $summary[$key] = [
                'limit' => $limit === null ? null : (float) $limit,
                'used' => $used[$key],
                'remaining' => $remaining === null ? null : max(0, (float) $remaining),
            ];
        }

        return $summary;
    }

    public function ensureQuantityPurchaseLimit(User $user, Product $product, string $quantity): void
    {
        $key = $product->unit === ProductUnit::Count ? 'count' : 'grams';
        $summary = $this->quantityPurchaseLimitSummary($user)[$key];
        $limit = $user->getAttribute('purchase_limit_'.$key);
        if ($limit === null) {
            return;
        }
        if ($product->unit === ProductUnit::Mithqal) {
            $quantity = DecimalMath::mul($quantity, '4.6083', 6);
        }
        $total = DecimalMath::add($summary['used'], $quantity, 6);
        if (bccomp($total, (string) $limit, 6) > 0) {
            abort(422, 'مقدار خرید بیشتر از حد خرید باقی‌مانده شما است. باقی‌مانده: '
                .$this->toPersianDigits((string) $summary['remaining']).' '.($key === 'count' ? 'عدد' : 'گرم'));
        }
    }

    public function getTransactionLimit(User $user): ?string
    {
        return $user->transaction_limit_rial === null
            ? null
            : (string) $user->transaction_limit_rial;
    }

    public function getUsedTransactionAmount(User $user): string
    {
        if (array_key_exists('transaction_limit_used_rial', $user->getAttributes())) {
            return (string) ($user->getAttribute('transaction_limit_used_rial') ?? 0);
        }

        return (string) $user->purchaseRequests()
            ->whereIn('status', [
                PurchaseRequestStatus::Pending->value,
                PurchaseRequestStatus::Approved->value,
                PurchaseRequestStatus::Completed->value,
            ])
            ->sum('total_amount_rial');
    }

    public function getRemainingTransactionLimit(User $user): ?string
    {
        $limit = $this->getTransactionLimit($user);
        if ($limit === null) {
            return null;
        }

        $remaining = DecimalMath::sub($limit, $this->getUsedTransactionAmount($user), 0);

        return bccomp($remaining, '0', 0) > 0 ? $remaining : '0';
    }

    public function canCreateTransaction(User $user, string $amountRial): bool
    {
        $remaining = $this->getRemainingTransactionLimit($user);

        return $remaining === null || bccomp($amountRial, $remaining, 0) <= 0;
    }

    public function ensureCanCreateTransaction(User $user, string $amountRial): void
    {
        $remaining = $this->getRemainingTransactionLimit($user);
        if ($remaining === null || bccomp($amountRial, $remaining, 0) <= 0) {
            return;
        }

        if (bccomp($remaining, '0', 0) === 0) {
            abort(422, 'سقف مجاز معاملات شما تکمیل شده است. برای افزایش حد معامله با مدیریت تماس بگیرید.');
        }

        abort(422, sprintf(
            'مبلغ این معامله بیشتر از حد معامله باقی‌مانده شما است. سقف باقی‌مانده: %s تومان',
            $this->toPersianDigits(number_format(intdiv((int) $remaining, 10))),
        ));
    }

    /** @return array{limit: ?int, used: int, remaining: ?int, unlimited: bool} */
    public function transactionLimitSummary(User $user): array
    {
        $limit = $this->getTransactionLimit($user);
        $used = $this->getUsedTransactionAmount($user);
        $calculatedRemaining = $limit === null ? null : DecimalMath::sub($limit, $used, 0);
        $remaining = $calculatedRemaining === null || bccomp($calculatedRemaining, '0', 0) > 0
            ? $calculatedRemaining
            : '0';

        return [
            'limit' => $limit === null ? null : (int) $limit,
            'used' => (int) $used,
            'remaining' => $remaining === null ? null : (int) $remaining,
            'unlimited' => $limit === null,
        ];
    }

    private function toPersianDigits(string $value): string
    {
        return strtr($value, [
            '0' => '۰', '1' => '۱', '2' => '۲', '3' => '۳', '4' => '۴',
            '5' => '۵', '6' => '۶', '7' => '۷', '8' => '۸', '9' => '۹',
        ]);
    }
}
