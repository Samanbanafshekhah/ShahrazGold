<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class HomeGoldBinding extends Model
{
    public const INTERVAL_SECONDS = 10;

    public const STALE_AFTER_SECONDS = 180;

    public const FIXED_SETTINGS = [
        'buy_field' => 'buyPrice', 'sell_field' => 'sellPrice',
        'unit_divisor' => '1', 'buy_percent' => '0', 'sell_percent' => '0',
        'interval_seconds' => self::INTERVAL_SECONDS,
        'stale_after_seconds' => self::STALE_AFTER_SECONDS,
    ];

    public const DEFAULT_OFFSETS = ['buy_offset_rial' => '0', 'sell_offset_rial' => '0'];

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'currency_multiplier' => 'integer', 'unit_divisor' => 'string',
            'buy_percent' => 'string', 'sell_percent' => 'string',
            'buy_offset_rial' => 'string', 'sell_offset_rial' => 'string',
            'interval_seconds' => 'integer', 'stale_after_seconds' => 'integer',
            'last_attempt_at' => 'immutable_datetime', 'last_success_at' => 'immutable_datetime',
            'last_quote' => 'array',
        ];
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function isStale(): bool
    {
        return $this->mode === 'auto' && (! $this->last_success_at
            || $this->last_success_at->addSeconds(self::STALE_AFTER_SECONDS)->lte(now()));
    }
}
