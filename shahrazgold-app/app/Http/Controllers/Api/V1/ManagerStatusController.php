<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\AppSetting;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ManagerStatusController extends Controller
{
    public function show(): JsonResponse
    {
        return $this->success([
            'online' => AppSetting::managerOnline(),
        ]);
    }

    public function update(Request $request, AuditService $audit): JsonResponse
    {
        $data = $request->validate([
            'online' => ['required', 'boolean'],
        ]);

        $old = AppSetting::managerOnline();
        $setting = AppSetting::setManagerOnline((bool) $data['online']);
        $online = AppSetting::managerOnline();

        if ($old !== $online) {
            $audit->record(
                'manager_status.updated',
                $setting,
                ['online' => $old],
                ['online' => $online],
            );
        }

        return $this->success([
            'online' => $online,
        ], 'Manager status updated.');
    }
}
