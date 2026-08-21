<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Cache;
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

        if ($this->usesCache()) {
            Cache::put($key, $payload, $ttl);

            return $ttl;
        }

        Redis::pipeline(function ($pipe) use ($key, $ttl, $payload, $expires, $user) {
            $pipe->setex($key, $ttl, $payload);
            $pipe->zadd($this->zset, $expires, (string) $user->id);
        });

        return $ttl;
    }

    public function users(): array
    {
        if ($this->usesCache()) {
            $values = User::query()
                ->pluck('id')
                ->map(fn ($id) => Cache::get(config('shahrazgold.presence.key_prefix', 'presence:user:').$id))
                ->all();

            return $this->decodeValues($values);
        }

        Redis::zremrangebyscore($this->zset, '-inf', (string) now()->timestamp);
        $ids = Redis::zrange($this->zset, 0, -1);
        if (! $ids) {
            return [];
        }
        $keys = array_map(fn ($id) => config('shahrazgold.presence.key_prefix', 'presence:user:').$id, $ids);
        $values = Redis::mget($keys);

        return $this->decodeValues($values);
    }

    public function count(): int
    {
        return count($this->users());
    }

    private function usesCache(): bool
    {
        return config('shahrazgold.presence.driver', 'redis') === 'cache';
    }

    private function decodeValues(array $values): array
    {
        return array_values(array_filter(array_map(
            fn ($value) => $value ? json_decode($value, true, 512, JSON_THROW_ON_ERROR) : null,
            $values,
        )));
    }
}
