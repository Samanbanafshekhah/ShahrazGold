<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Redis;

final class PresenceService
{
    private string $zset = 'presence:online';

    public function heartbeat(User $user, ?string $ipAddress = null): int
    {
        $ttl = (int) config('shahrazgold.presence.ttl_seconds', 90);
        $expires = now()->timestamp + $ttl;
        $key = config('shahrazgold.presence.key_prefix', 'presence:user:').$user->id;
        $payload = json_encode([
            'id' => $user->id,
            'first_name' => $user->first_name,
            'last_name' => $user->last_name,
            'mobile' => $user->mobile,
            'ip_address' => $ipAddress,
            'last_seen_at' => now()->utc()->toIso8601String(),
        ], JSON_THROW_ON_ERROR);
        Redis::pipeline(function ($pipe) use ($key, $ttl, $payload, $expires, $user) {
            $pipe->setex($key, $ttl, $payload);
            $pipe->zadd($this->zset, $expires, (string) $user->id);
        });

        return $ttl;
    }

    public function users(): array
    {
        Redis::zremrangebyscore($this->zset, '-inf', (string) now()->timestamp);
        $ids = Redis::zrange($this->zset, 0, -1);
        if (! $ids) {
            return [];
        }
        $keys = array_map(fn ($id) => config('shahrazgold.presence.key_prefix', 'presence:user:').$id, $ids);
        $values = Redis::mget($keys);

        return array_values(array_filter(array_map(fn ($v) => $v ? json_decode($v, true, 512, JSON_THROW_ON_ERROR) : null, $values)));
    }

    public function count(): int
    {
        return count($this->users());
    }
}
