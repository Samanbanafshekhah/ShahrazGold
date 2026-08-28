<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\TooManyRequestsHttpException;

class RegistrationOtpService
{
    public function __construct(private readonly KavenegarSmsService $sms) {}

    /**
     * @param  array<string, mixed>  $registration
     * @return array{registration_token: string, mobile: string, expires_in: int, resend_after: int}
     */
    public function start(array $registration): array
    {
        $token = Str::random(64);
        $code = $this->newCode();
        $now = now()->timestamp;
        $ttl = max(60, (int) config('services.kavenegar.otp_ttl', 300));

        $this->sms->sendOtp((string) $registration['mobile'], $code);

        Cache::put($this->key($token), [
            'first_name' => $registration['first_name'],
            'last_name' => $registration['last_name'],
            'mobile' => $registration['mobile'],
            'email' => $registration['email'] ?? null,
            'password' => Hash::make((string) $registration['password']),
            'code_hash' => $this->codeHash($token, $code),
            'attempts' => 0,
            'sent_at' => $now,
            'expires_at' => $now + $ttl,
        ], $ttl);

        return $this->publicState($token, (string) $registration['mobile'], $ttl);
    }

    /** @return array<string, mixed> */
    public function consume(string $token, string $code): array
    {
        $key = $this->key($token);
        $pending = Cache::get($key);
        if (! is_array($pending)) {
            throw ValidationException::withMessages(['code' => ['کد تأیید منقضی شده است؛ دوباره ثبت‌نام کنید.']]);
        }

        $maxAttempts = max(1, (int) config('services.kavenegar.otp_max_attempts', 5));
        if (! hash_equals((string) $pending['code_hash'], $this->codeHash($token, $code))) {
            $pending['attempts'] = (int) $pending['attempts'] + 1;
            if ($pending['attempts'] >= $maxAttempts) {
                Cache::forget($key);
                throw ValidationException::withMessages(['code' => ['تعداد تلاش‌ها بیش از حد مجاز بود؛ دوباره ثبت‌نام کنید.']]);
            }

            Cache::put($key, $pending, max(1, (int) $pending['expires_at'] - now()->timestamp));
            throw ValidationException::withMessages(['code' => ['کد تأیید صحیح نیست.']]);
        }

        Cache::forget($key);

        return $pending;
    }

    /** @return array{registration_token: string, mobile: string, expires_in: int, resend_after: int} */
    public function resend(string $token): array
    {
        $key = $this->key($token);
        $pending = Cache::get($key);
        if (! is_array($pending)) {
            throw ValidationException::withMessages(['registration_token' => ['درخواست ثبت‌نام منقضی شده است.']]);
        }

        $cooldown = max(1, (int) config('services.kavenegar.otp_resend_after', 90));
        $retryAfter = $cooldown - (now()->timestamp - (int) $pending['sent_at']);
        if ($retryAfter > 0) {
            throw new TooManyRequestsHttpException($retryAfter, 'برای ارسال مجدد کد کمی صبر کنید.');
        }

        $code = $this->newCode();
        $ttl = max(60, (int) config('services.kavenegar.otp_ttl', 300));
        $this->sms->sendOtp((string) $pending['mobile'], $code);

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
        return 'auth:registration-otp:'.$token;
    }

    /** @return array{registration_token: string, mobile: string, expires_in: int, resend_after: int} */
    private function publicState(string $token, string $mobile, int $ttl): array
    {
        return [
            'registration_token' => $token,
            'mobile' => $mobile,
            'expires_in' => $ttl,
            'resend_after' => max(1, (int) config('services.kavenegar.otp_resend_after', 90)),
        ];
    }
}
