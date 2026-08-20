<?php

namespace App\Models;

use App\Enums\EntryMode;
use App\Enums\PurchaseRequestStatus;
use App\Enums\TradeType;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PurchaseRequest extends Model
{
    use HasFactory;

    protected $guarded = ['id', 'approved_by', 'approved_at', 'rejected_by', 'rejected_at', 'completed_by', 'completed_at'];

    protected function casts(): array
    {
        return [
            'trade_type' => TradeType::class,
            'entry_mode' => EntryMode::class,
            'status' => PurchaseRequestStatus::class,
            'requested_quantity' => 'decimal:6',
            'calculated_quantity' => 'decimal:6',
            'trade_adjustment_enabled' => 'boolean',
            'trade_adjustment_percent' => 'decimal:4',
            'requested_amount_rial' => 'string',
            'raw_unit_price_rial' => 'string',
            'adjustment_amount_per_unit_rial' => 'string',
            'final_unit_price_rial' => 'string',
            'total_amount_rial' => 'string',
            'price_effective_at' => 'immutable_datetime',
            'approved_at' => 'immutable_datetime', 'rejected_at' => 'immutable_datetime', 'completed_at' => 'immutable_datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function productPrice(): BelongsTo
    {
        return $this->belongsTo(ProductPrice::class);
    }

    public function histories(): HasMany
    {
        return $this->hasMany(PurchaseRequestStatusHistory::class);
    }
}
