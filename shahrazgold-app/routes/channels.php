<?php

use App\Models\User;
use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('prices.admin', fn (User $user): bool => $user->is_active && $user->isAdmin());

Broadcast::channel('prices.role.{roleId}', function (User $user, int $roleId): bool {
    if (! $user->is_active || $user->isAdmin() || (int) $user->role_id !== $roleId) {
        return false;
    }

    return $user->accessRole?->is_active === true;
});
