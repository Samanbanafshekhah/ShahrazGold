<?php

namespace App\Models;

use App\Enums\PricingMode;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProductPrice extends Model
{
    use HasFactory;

    public const UPDATED_AT = null;

    protected $fillable = ['product_id', 'market_price_quote_id', 'raw_price_rial', 'pricing_mode', 'formula_key', 'formula_parameters', 'created_by', 'effective_at'];

    protected function casts(): array
    {
        return [
            'raw_price_rial' => 'string',
            'pricing_mode' => PricingMode::class,
            'formula_parameters' => 'array',
            'effective_at' => 'immutable_datetime',
        ];
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function quote(): BelongsTo
    {
        return $this->belongsTo(MarketPriceQuote::class, 'market_price_quote_id');
    }

    protected static function booted(): void
    {
        static::updating(fn () => throw new \LogicException('Product prices are immutable.'));
        static::deleting(fn () => throw new \LogicException('Product prices are immutable.'));
    }
}
