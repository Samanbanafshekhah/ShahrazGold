<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Services\PresenceService;
use Illuminate\Http\JsonResponse;

class PresenceController extends Controller
{
    public function index(PresenceService $p): JsonResponse
    {
        $users = $p->users();

        return $this->success(['count' => count($users), 'users' => $users]);
    }

    public function count(PresenceService $p): JsonResponse
    {
        return $this->success(['count' => $p->count()]);
    }
}
