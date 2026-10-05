<?php

namespace App\Http\Resources;

use App\Services\PurchaseRequestService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $role = $this->relationLoaded('accessRole') ? $this->accessRole : null;
        $transactionLimit = app(PurchaseRequestService::class)->transactionLimitSummary($this->resource);

        return ['id' => $this->id, 'first_name' => $this->first_name, 'last_name' => $this->last_name, 'mobile' => $this->mobile, 'email' => $this->email, 'role' => $this->role->value, 'role_id' => $this->role_id, 'role_name' => $role?->name, 'role_slug' => $role?->slug ?? $this->role->value, 'is_active' => $this->is_active, 'can_reorder_products' => $this->canReorderProducts(), 'purchase_limits' => app(PurchaseRequestService::class)->quantityPurchaseLimitSummary($this->resource), 'transaction_limit' => $transactionLimit['limit'], 'transaction_limit_used' => $transactionLimit['used'], 'transaction_limit_remaining' => $transactionLimit['remaining'], 'transaction_limit_unlimited' => $transactionLimit['unlimited'], 'mobile_verified_at' => $this->mobile_verified_at?->utc()->toIso8601String(), 'last_login_at' => $this->last_login_at?->utc()->toIso8601String(), 'created_at' => $this->created_at?->utc()->toIso8601String()];
    }
}
