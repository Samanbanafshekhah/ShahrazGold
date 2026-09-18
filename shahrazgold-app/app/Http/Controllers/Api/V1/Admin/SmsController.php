<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Exceptions\KavenegarException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\SendSmsRequest;
use App\Models\User;
use App\Services\AuditService;
use App\Services\KavenegarSmsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;

class SmsController extends Controller
{
    public function recipients(): JsonResponse
    {
        $users = User::query()
            ->select(['id', 'first_name', 'last_name', 'mobile', 'is_active'])
            ->orderBy('first_name')
            ->orderBy('last_name')
            ->get()
            ->map(fn (User $user) => [
                'id' => $user->id,
                'name' => trim($user->first_name.' '.$user->last_name),
                'mobile' => $user->mobile,
                'is_active' => $user->is_active,
            ]);

        return $this->success($users, 'فهرست گیرندگان دریافت شد.');
    }

    public function store(
        SendSmsRequest $request,
        KavenegarSmsService $sms,
        AuditService $audit,
    ): JsonResponse {
        $data = $request->validated();
        $users = User::query()
            ->select(['id', 'mobile'])
            ->when(
                $data['audience'] === 'all_active',
                fn ($query) => $query->where('is_active', true),
                fn ($query) => $query->whereIn('id', $data['user_ids'] ?? []),
            )
            ->whereNotNull('mobile')
            ->orderBy('id')
            ->get()
            ->unique('mobile')
            ->values();

        if ($users->isEmpty()) {
            throw ValidationException::withMessages([
                'user_ids' => ['هیچ گیرنده‌ی معتبری برای ارسال پیدا نشد.'],
            ]);
        }

        $accepted = 0;
        $failed = 0;
        $firstFailure = null;

        $users->chunk(200)->each(function (Collection $chunk) use ($sms, $data, &$accepted, &$failed, &$firstFailure): void {
            if ($firstFailure instanceof KavenegarException) {
                $failed += $chunk->count();

                return;
            }

            try {
                $entries = $sms->sendMany($chunk->pluck('mobile')->all(), trim($data['message']));
                $acceptedInBatch = min(count($entries), $chunk->count());
                $accepted += $acceptedInBatch;
                $failed += $chunk->count() - $acceptedInBatch;
            } catch (KavenegarException $exception) {
                report($exception);
                $firstFailure = $exception;
                $failed += $chunk->count();
            }
        });

        $audit->record('sms.sent', null, null, [
            'audience' => $data['audience'],
            'message' => trim($data['message']),
            'recipient_count' => $users->count(),
            'accepted_count' => $accepted,
            'failed_count' => $failed,
        ]);

        if ($accepted === 0 && $firstFailure instanceof KavenegarException) {
            throw $firstFailure;
        }

        return $this->success([
            'recipient_count' => $users->count(),
            'accepted_count' => $accepted,
            'failed_count' => $failed,
        ], $failed > 0 ? 'ارسال پیامک با تعدادی خطا انجام شد.' : 'پیامک‌ها با موفقیت در صف ارسال قرار گرفتند.');
    }
}
