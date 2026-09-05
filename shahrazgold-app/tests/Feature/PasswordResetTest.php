<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Tests\CreatesDomain;
use Tests\TestCase;

class PasswordResetTest extends TestCase
{
    use CreatesDomain, RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withServerVariables(['REMOTE_ADDR' => '10.98.'.random_int(1, 254).'.'.random_int(1, 254)]);
        config([
            'services.kavenegar.api_key' => 'test-api-key',
            'services.kavenegar.otp_template' => 'shahrazgoldverify',
        ]);
        Http::fake(['api.kavenegar.com/*' => Http::response([
            'return' => ['status' => 200, 'message' => 'تأیید شد'],
            'entries' => [['messageid' => 123, 'status' => 1]],
        ])]);
    }

    public function test_user_can_reset_password_with_sms_otp_and_old_sessions_are_revoked(): void
    {
        $user = $this->customer([
            'mobile' => '09123456789',
            'password' => 'old-password',
        ]);
        $user->createToken('old-session');

        $started = $this->postJson('/api/v1/auth/forgot-password', [
            'mobile' => $user->mobile,
        ])->assertAccepted()->assertJsonStructure([
            'data' => ['reset_token', 'mobile', 'expires_in', 'resend_after'],
        ]);

        $smsRequest = Http::recorded()->last()[0];
        $this->assertSame($user->mobile, $smsRequest['receptor']);
        $this->assertSame('shahrazgoldverify', $smsRequest['template']);
        $this->assertMatchesRegularExpression('/^\d{6}$/', $smsRequest['token']);

        $payload = [
            'reset_token' => $started->json('data.reset_token'),
            'code' => $smsRequest['token'],
            'password' => 'new-password',
            'password_confirmation' => 'new-password',
        ];

        $this->postJson('/api/v1/auth/reset-password', [
            ...$payload,
            'code' => '000000',
        ])->assertUnprocessable()->assertJsonValidationErrors('code');

        $this->postJson('/api/v1/auth/reset-password', $payload)
            ->assertOk()
            ->assertJsonPath('message', 'رمز عبور با موفقیت تغییر کرد.');

        $user->refresh();
        $this->assertTrue(Hash::check('new-password', $user->password));
        $this->assertDatabaseMissing('personal_access_tokens', ['tokenable_id' => $user->id]);

        $this->postJson('/api/v1/auth/reset-password', $payload)
            ->assertUnprocessable()
            ->assertJsonValidationErrors('code');
        $this->postJson('/api/v1/auth/login', [
            'mobile' => $user->mobile,
            'password' => 'old-password',
        ])->assertUnauthorized();
        $this->postJson('/api/v1/auth/login', [
            'mobile' => $user->mobile,
            'password' => 'new-password',
        ])->assertOk();
    }

    public function test_unknown_or_inactive_mobile_does_not_reveal_account_or_send_sms(): void
    {
        $inactive = $this->customer([
            'mobile' => '09121111111',
            'is_active' => false,
        ]);

        foreach (['09999999999', $inactive->mobile] as $mobile) {
            $response = $this->postJson('/api/v1/auth/forgot-password', [
                'mobile' => $mobile,
            ])->assertAccepted()
                ->assertJsonPath(
                    'message',
                    'اگر حساب فعالی با این شماره وجود داشته باشد، کد بازیابی ارسال می‌شود.',
                )
                ->assertJsonStructure(['data' => ['reset_token', 'mobile', 'expires_in', 'resend_after']]);

            $this->postJson('/api/v1/auth/reset-password', [
                'reset_token' => $response->json('data.reset_token'),
                'code' => '000000',
                'password' => 'new-password',
                'password_confirmation' => 'new-password',
            ])->assertUnprocessable()->assertJsonValidationErrors('code');
        }

        Http::assertNothingSent();
    }

    public function test_sms_provider_failure_does_not_reveal_active_account(): void
    {
        $user = $this->customer(['mobile' => '09125556666']);
        Http::fake(['api.kavenegar.com/*' => Http::response([
            'return' => ['status' => 500, 'message' => 'provider unavailable'],
            'entries' => [],
        ], 503)]);

        foreach ([$user->mobile, '09998887766'] as $mobile) {
            $this->postJson('/api/v1/auth/forgot-password', [
                'mobile' => $mobile,
            ])->assertAccepted()
                ->assertJsonPath(
                    'message',
                    'اگر حساب فعالی با این شماره وجود داشته باشد، کد بازیابی ارسال می‌شود.',
                );
        }

        Http::assertSentCount(1);
    }

    public function test_resend_replaces_previous_password_reset_code(): void
    {
        $user = $this->customer(['mobile' => '09123334444']);
        $started = $this->postJson('/api/v1/auth/forgot-password', [
            'mobile' => $user->mobile,
        ])->assertAccepted();
        $resetToken = $started->json('data.reset_token');
        $firstCode = Http::recorded()->last()[0]['token'];

        $this->travel(91)->seconds();
        $this->postJson('/api/v1/auth/forgot-password/resend', [
            'reset_token' => $resetToken,
        ])->assertOk();
        $secondCode = Http::recorded()->last()[0]['token'];
        $this->assertNotSame($firstCode, $secondCode);

        $passwordPayload = [
            'reset_token' => $resetToken,
            'password' => 'new-password',
            'password_confirmation' => 'new-password',
        ];
        $this->postJson('/api/v1/auth/reset-password', [
            ...$passwordPayload,
            'code' => $firstCode,
        ])->assertUnprocessable();
        $this->postJson('/api/v1/auth/reset-password', [
            ...$passwordPayload,
            'code' => $secondCode,
        ])->assertOk();
    }
}
