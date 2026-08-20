<?php

namespace App\Models;

use App\Enums\ProductUnit;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class MarketPriceSource extends Model
{
    use HasFactory;

    protected $fillable = ['code', 'title', 'unit', 'is_active'];

    protected function casts(): array
    {
        return ['unit' => ProductUnit::class, 'is_active' => 'boolean'];
    }

    public function quotes(): HasMany
    {
        return $this->hasMany(MarketPriceQuote::class);
    }

    public function currentQuote(): HasOne
    {
        return $this->hasOne(MarketPriceQuote::class)->ofMany(['effective_at' => 'max', 'id' => 'max']);
    }
}
