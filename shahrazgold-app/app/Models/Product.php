<?php

namespace App\Models;

use App\Enums\PricingMode;
use App\Enums\ProductUnit;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

class Product extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'product_category_id', 'name', 'slug', 'symbol', 'description', 'icon', 'image_path', 'unit',
        'pricing_mode', 'price_source_id', 'pricing_formula_key', 'is_active', 'is_buyable', 'is_sellable',
        'display_order', 'price_step_rial', 'trade_adjustment_enabled', 'trade_adjustment_percent', 'sell_price_difference_rial',
    ];

    protected function casts(): array
    {
        return [
            'unit' => ProductUnit::class,
            'pricing_mode' => PricingMode::class,
            'is_active' => 'boolean',
            'is_buyable' => 'boolean',
            'is_sellable' => 'boolean',
            'trade_adjustment_enabled' => 'boolean',
            'trade_adjustment_percent' => 'decimal:4',
            'sell_price_difference_rial' => 'integer',
            'display_order' => 'integer',
            'price_step_rial' => 'integer',
        ];
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(ProductCategory::class, 'product_category_id');
    }

    public function priceSource(): BelongsTo
    {
        return $this->belongsTo(MarketPriceSource::class, 'price_source_id');
    }

    public function prices(): HasMany
    {
        return $this->hasMany(ProductPrice::class);
    }

    public function currentPrice(): HasOne
    {
        return $this->hasOne(ProductPrice::class)->ofMany(['effective_at' => 'max', 'id' => 'max']);
    }
}
