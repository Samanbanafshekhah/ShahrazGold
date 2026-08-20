<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\AppSetting;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

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

        $online = DB::transaction(function () use ($data, $audit): bool {
            $old = AppSetting::managerOnline();
            AppSetting::setManagerOnline((bool) $data['online']);
            $online = AppSetting::managerOnline();

            if ($old !== $online) {
                // AppSetting uses a string primary key, while audit_logs.subject_id
                // is an integer morph column. Keep the setting key in the payload
                // instead of attempting to store it as a polymorphic subject ID.
                $audit->record(
                    'manager_status.updated',
                    null,
                    ['setting_key' => AppSetting::MANAGER_ONLINE, 'online' => $old],
                    ['setting_key' => AppSetting::MANAGER_ONLINE, 'online' => $online],
                );
            }

            return $online;
        });

        return $this->success([
            'online' => $online,
        ], 'Manager status updated.');
    }
}
