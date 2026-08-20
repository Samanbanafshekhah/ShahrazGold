<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MarketPriceQuote extends Model
{
    use HasFactory;

    public const UPDATED_AT = null;

    protected $fillable = ['market_price_source_id', 'price_rial', 'note', 'created_by', 'effective_at'];

    protected function casts(): array
    {
        return ['price_rial' => 'string', 'effective_at' => 'immutable_datetime'];
    }

    public function source(): BelongsTo
    {
        return $this->belongsTo(MarketPriceSource::class, 'market_price_source_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    protected static function booted(): void
    {
        static::updating(fn () => throw new \LogicException('Market quotes are immutable.'));
        static::deleting(fn () => throw new \LogicException('Market quotes are immutable.'));
    }
}
