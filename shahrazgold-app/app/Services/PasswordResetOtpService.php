<?php

namespace App\Services;

use App\Exceptions\KavenegarException;
use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\TooManyRequestsHttpException;

class PasswordResetOtpService
{
    public function __construct(private readonly KavenegarSmsService $sms) {}

    /** @return array{reset_token: string, mobile: string, expires_in: int, resend_after: int} */
    public function start(string $mobile): array
    {
        $user = User::query()
            ->where('mobile', $mobile)
            ->where('is_active', true)
            ->first();
        $token = Str::random(64);
        $code = $this->newCode();
        $now = now()->timestamp;
        $ttl = $this->ttl();

        if ($user) {
            try {
                $this->sms->sendOtp($mobile, $code);
            } catch (KavenegarException $exception) {
                report($exception);
            }
        }

        Cache::put($this->key($token), [
            'user_id' => $user?->getKey(),
            'mobile' => $mobile,
            'code_hash' => $this->codeHash($token, $code),
            'attempts' => 0,
            'sent_at' => $now,
            'expires_at' => $now + $ttl,
        ], $ttl);

        return $this->publicState($token, $mobile, $ttl);
    }

    public function reset(string $token, string $code, string $password): void
    {
        $key = $this->key($token);
        $pending = Cache::get($key);
        if (! is_array($pending)) {
            throw ValidationException::withMessages(['code' => ['کد بازیابی منقضی شده است؛ دوباره درخواست کد کنید.']]);
        }

        $maxAttempts = max(1, (int) config('services.kavenegar.otp_max_attempts', 5));
        if (! hash_equals((string) $pending['code_hash'], $this->codeHash($token, $code))) {
            $pending['attempts'] = (int) $pending['attempts'] + 1;
            if ($pending['attempts'] >= $maxAttempts) {
                Cache::forget($key);
                throw ValidationException::withMessages(['code' => ['تعداد تلاش‌ها بیش از حد مجاز بود؛ دوباره درخواست کد کنید.']]);
            }

            Cache::put($key, $pending, max(1, (int) $pending['expires_at'] - now()->timestamp));
            throw ValidationException::withMessages(['code' => ['کد بازیابی صحیح نیست.']]);
        }

        $userId = $pending['user_id'] ?? null;
        $user = $userId
            ? User::query()->whereKey($userId)->where('mobile', $pending['mobile'])->where('is_active', true)->first()
            : null;
        if (! $user) {
            Cache::forget($key);
            throw ValidationException::withMessages(['code' => ['کد بازیابی معتبر نیست؛ دوباره درخواست کد کنید.']]);
        }

        $user->update(['password' => $password]);
        $user->tokens()->delete();
        Cache::forget($key);
    }

    /** @return array{reset_token: string, mobile: string, expires_in: int, resend_after: int} */
    public function resend(string $token): array
    {
        $key = $this->key($token);
        $pending = Cache::get($key);
        if (! is_array($pending)) {
            throw ValidationException::withMessages(['reset_token' => ['درخواست بازیابی منقضی شده است.']]);
        }

        $cooldown = $this->resendAfter();
        $retryAfter = $cooldown - (now()->timestamp - (int) $pending['sent_at']);
        if ($retryAfter > 0) {
            throw new TooManyRequestsHttpException($retryAfter, 'برای ارسال مجدد کد کمی صبر کنید.');
        }

        $code = $this->newCode();
        $ttl = $this->ttl();
        if ($pending['user_id'] ?? null) {
            try {
                $this->sms->sendOtp((string) $pending['mobile'], $code);
            } catch (KavenegarException $exception) {
                report($exception);
            }
        }

        $now = now()->timestamp;
        $pending['code_hash'] = $this->codeHash($token, $code);
        $pending['attempts'] = 0;
        $pending['sent_at'] = $now;
        $pending['expires_at'] = $now + $ttl;
        Cache::put($key, $pending, $ttl);

        return $this->publicState($token, (string) $pending['mobile'], $ttl);
    }

    private function newCode(): string
    {
        return (string) random_int(100000, 999999);
    }

    private function codeHash(string $token, string $code): string
    {
        return hash_hmac('sha256', $token.'|'.$code, (string) config('app.key'));
    }

    private function key(string $token): string
    {
        return 'auth:password-reset-otp:'.$token;
    }

    private function ttl(): int
    {
        return max(60, (int) config('services.kavenegar.otp_ttl', 300));
    }

    private function resendAfter(): int
    {
        return max(1, (int) config('services.kavenegar.otp_resend_after', 90));
    }

    /** @return array{reset_token: string, mobile: string, expires_in: int, resend_after: int} */
    private function publicState(string $token, string $mobile, int $ttl): array
    {
        return [
            'reset_token' => $token,
            'mobile' => $mobile,
            'expires_in' => $ttl,
            'resend_after' => $this->resendAfter(),
        ];
    }
}
