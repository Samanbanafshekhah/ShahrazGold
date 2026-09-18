<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Tests\CreatesDomain;
use Tests\TestCase;

class AdminSmsTest extends TestCase
{
    use CreatesDomain, RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config([
            'services.kavenegar.api_key' => 'test-api-key',
            'services.kavenegar.sender' => '10001234',
        ]);
        Http::fake(function (Request $request) {
            $receptors = explode(',', (string) $request['receptor']);

            return Http::response([
                'return' => ['status' => 200, 'message' => 'تأیید شد'],
                'entries' => array_map(fn (string $mobile, int $index) => [
                    'messageid' => 1000 + $index,
                    'status' => 1,
                    'receptor' => $mobile,
                ], $receptors, array_keys($receptors)),
            ]);
        });
    }

    public function test_only_admin_can_access_sms_tools(): void
    {
        Sanctum::actingAs($this->customer());

        $this->getJson('/api/v1/admin/sms/recipients')->assertForbidden();
        $this->postJson('/api/v1/admin/sms', [
            'audience' => 'all_active',
            'message' => 'پیام آزمایشی',
        ])->assertForbidden();
    }

    public function test_admin_can_send_a_custom_sms_to_selected_users(): void
    {
        $admin = $this->admin();
        $first = $this->customer(['mobile' => '09121111111']);
        $second = $this->customer(['mobile' => '09122222222', 'is_active' => false]);
        Sanctum::actingAs($admin);

        $this->getJson('/api/v1/admin/sms/recipients')
            ->assertOk()
            ->assertJsonCount(3, 'data');

        $this->postJson('/api/v1/admin/sms', [
            'audience' => 'selected',
            'user_ids' => [$first->id, $second->id],
            'message' => 'پیام دلخواه مدیریت',
        ])->assertOk()
            ->assertJsonPath('data.recipient_count', 2)
            ->assertJsonPath('data.accepted_count', 2)
            ->assertJsonPath('data.failed_count', 0);

        Http::assertSent(fn (Request $request) => $request->url() === 'https://api.kavenegar.com/v1/test-api-key/sms/send.json'
            && $request['receptor'] === '09121111111,09122222222'
            && $request['message'] === 'پیام دلخواه مدیریت'
            && $request['sender'] === '10001234');

        $audit = AuditLog::query()->where('event', 'sms.sent')->firstOrFail();
        $this->assertSame($admin->id, $audit->actor_id);
        $this->assertSame(2, $audit->new_values['accepted_count']);
    }

    public function test_send_to_all_targets_only_active_users(): void
    {
        $admin = $this->admin(['mobile' => '09120000000']);
        $active = $this->customer(['mobile' => '09123333333']);
        $inactive = $this->customer(['mobile' => '09124444444', 'is_active' => false]);
        Sanctum::actingAs($admin);

        $this->postJson('/api/v1/admin/sms', [
            'audience' => 'all_active',
            'message' => 'پیام برای همه کاربران فعال',
        ])->assertOk()
            ->assertJsonPath('data.recipient_count', 2)
            ->assertJsonPath('data.accepted_count', 2);

        Http::assertSent(function (Request $request) use ($admin, $active, $inactive) {
            $receptors = explode(',', (string) $request['receptor']);

            return in_array($admin->mobile, $receptors, true)
                && in_array($active->mobile, $receptors, true)
                && ! in_array($inactive->mobile, $receptors, true);
        });
    }

    public function test_selected_audience_requires_users_and_message(): void
    {
        Sanctum::actingAs($this->admin());

        $this->postJson('/api/v1/admin/sms', [
            'audience' => 'selected',
            'user_ids' => [],
            'message' => '',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['user_ids', 'message']);

        Http::assertNothingSent();
    }
}
