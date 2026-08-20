<?php

namespace App\Services;

use App\Enums\EntryMode;
use App\Enums\PurchaseRequestStatus;
use App\Enums\TradeType;
use App\Events\PurchaseRequestApproved;
use App\Events\PurchaseRequestCreated;
use App\Events\PurchaseRequestRejected;
use App\Exceptions\PriceChangedException;
use App\Models\Product;
use App\Models\ProductPrice;
use App\Models\PurchaseRequest;
use App\Models\User;
use App\Services\Pricing\TradePriceCalculator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class PurchaseRequestService
{
    public function __construct(private TradePriceCalculator $calculator, private AuditService $audit) {}

    public function create(User $user, array $input): PurchaseRequest
    {
        return DB::transaction(function () use ($user, $input) {
            User::query()->lockForUpdate()->findOrFail($user->id);
            $existing = PurchaseRequest::query()->where('user_id', $user->id)->where('client_reference', $input['client_reference'])->first();
            if ($existing) {
                return $existing;
            }

            $product = Product::query()->lockForUpdate()->findOrFail($input['product_id']);
            $price = ProductPrice::query()->where('product_id', $product->id)
                ->orderByDesc('effective_at')->orderByDesc('id')->lockForUpdate()->first();
            abort_if(! $price, 409, 'PRICE_UNAVAILABLE');
            $tradeType = TradeType::from($input['trade_type']);
            $entryMode = EntryMode::from($input['entry_mode']);
            abort_unless($product->is_active, 409, 'Product is inactive.');
            abort_if($tradeType === TradeType::CustomerBuy && ! $product->is_buyable, 409, 'Product is not buyable.');
            abort_if($tradeType === TradeType::CustomerSell && ! $product->is_sellable, 409, 'Product is not sellable.');
            $calculation = $this->calculator->calculate($product, $price, $tradeType, $entryMode, $input['quantity'] ?? null, $input['amount_rial'] ?? null);

            if ((int) $input['expected_product_price_id'] !== $price->id) {
                throw new PriceChangedException($this->previewPayload($product, $tradeType, $entryMode, $calculation));
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
            abort_unless(in_array($to, $allowed, true), 409, "Invalid status transition from {$from->value} to {$to->value}.");
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
}
