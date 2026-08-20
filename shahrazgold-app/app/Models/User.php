<?php

namespace App\Models;

use App\Enums\UserRole;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable, SoftDeletes;

    protected $fillable = ['first_name', 'last_name', 'mobile', 'email', 'password', 'role', 'role_id', 'is_active', 'mobile_verified_at'];

    protected $hidden = ['password', 'remember_token'];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'role' => UserRole::class,
            'is_active' => 'boolean',
            'mobile_verified_at' => 'immutable_datetime',
            'last_login_at' => 'immutable_datetime',
            'password' => 'hashed',
        ];
    }

    public function purchaseRequests(): HasMany
    {
        return $this->hasMany(PurchaseRequest::class);
    }

    public function accessRole(): BelongsTo
    {
        return $this->belongsTo(Role::class, 'role_id');
    }

    public function isAdmin(): bool
    {
        return $this->role === UserRole::Admin || $this->accessRole?->slug === UserRole::Admin->value;
    }

    public function canBuyProduct(int $productId): bool
    {
        if ($this->isAdmin()) {
            return true;
        }

        return $this->accessRole?->canBuyProduct($productId) ?? false;
    }

    /**
     * @return array{buy: string, sell: string}
     */
    public function priceAdjustmentsFor(int $productId): array
    {
        $this->loadMissing('accessRole.products');
        $role = $this->accessRole;
        if (! $role?->is_active) {
            return ['buy' => '0', 'sell' => '0'];
        }

        $product = $role->relationLoaded('products')
            ? $role->products->firstWhere('id', $productId)
            : $role->products()->whereKey($productId)->first();

        return [
            'buy' => (string) ($product?->pivot?->buy_price_adjustment_rial ?? 0),
            'sell' => (string) ($product?->pivot?->sell_price_adjustment_rial ?? 0),
        ];
    }
}
