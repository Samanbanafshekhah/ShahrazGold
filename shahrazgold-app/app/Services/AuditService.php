<?php

namespace App\Services;

use App\Models\AuditLog;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Arr;
use Illuminate\Support\Str;

final class AuditService
{
    private const SENSITIVE = ['password', 'password_confirmation', 'token', 'access_token', 'cookie', 'remember_token'];

    public function record(string $event, ?Model $subject = null, ?array $old = null, ?array $new = null, ?int $actorId = null): AuditLog
    {
        $request = app()->bound('request') ? request() : null;

        return AuditLog::create([
            'actor_id' => $actorId ?? optional($request?->user())->id,
            'event' => $event,
            'subject_type' => $subject?->getMorphClass(),
            'subject_id' => $subject?->getKey(),
            'old_values' => $this->sanitize($old),
            'new_values' => $this->sanitize($new),
            'ip_address' => $request?->ip(),
            'user_agent' => Str::limit((string) $request?->userAgent(), 1000, ''),
            'request_id' => Str::isUuid((string) $request?->header('X-Request-ID')) ? $request->header('X-Request-ID') : (string) Str::uuid(),
        ]);
    }

    private function sanitize(?array $values): ?array
    {
        if ($values === null) {
            return null;
        }

        return Arr::except($values, self::SENSITIVE);
    }
}
