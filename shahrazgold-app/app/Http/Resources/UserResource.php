<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $role = $this->relationLoaded('accessRole') ? $this->accessRole : null;

        return ['id' => $this->id, 'first_name' => $this->first_name, 'last_name' => $this->last_name, 'mobile' => $this->mobile, 'email' => $this->email, 'role' => $this->role->value, 'role_id' => $this->role_id, 'role_name' => $role?->name, 'role_slug' => $role?->slug ?? $this->role->value, 'is_active' => $this->is_active, 'mobile_verified_at' => $this->mobile_verified_at?->utc()->toIso8601String(), 'last_login_at' => $this->last_login_at?->utc()->toIso8601String(), 'created_at' => $this->created_at?->utc()->toIso8601String()];
    }
}
