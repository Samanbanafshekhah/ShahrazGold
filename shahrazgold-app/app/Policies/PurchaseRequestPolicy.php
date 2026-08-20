<?php

namespace App\Policies;

use App\Models\PurchaseRequest;
use App\Models\User;

class PurchaseRequestPolicy
{
    public function view(User $user, PurchaseRequest $request): bool
    {
        return $user->isAdmin() || $request->user_id === $user->id;
    }

    public function cancel(User $user, PurchaseRequest $request): bool
    {
        return $request->user_id === $user->id;
    }
}
