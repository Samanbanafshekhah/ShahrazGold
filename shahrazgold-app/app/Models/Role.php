<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Role extends Model
{
    use HasFactory;

    protected $fillable = ['name', 'slug', 'description', 'is_active'];

    protected function casts(): array
    {
        return ['is_active' => 'boolean'];
    }

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    public function products(): BelongsToMany
    {
        return $this->belongsToMany(Product::class, 'role_product_permissions')
            ->withPivot([
                'can_access',
                'can_buy',
                'buy_price_adjustment_rial',
                'sell_price_adjustment_rial',
            ])->withTimestamps();
    }

    public function canBuyProduct(int $productId): bool
    {
        $permission = $this->products()->whereKey($productId)->first();

        return (bool) ($permission?->pivot?->can_access && $permission?->pivot?->can_buy);
    }
}
