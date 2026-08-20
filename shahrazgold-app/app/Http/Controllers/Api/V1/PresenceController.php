<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\PresenceService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PresenceController extends Controller
{
    public function heartbeat(Request $request, PresenceService $presence): JsonResponse
    {
        $ttl = $presence->heartbeat($request->user(), $request->ip());

        return $this->success(['ttl_seconds' => $ttl, 'heartbeat_at' => now()->utc()->toIso8601String()], 'Heartbeat recorded.');
    }
}
