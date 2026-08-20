<?php

namespace Tests\Feature;

use App\Events\AnnouncementPublished;
use App\Models\AuditLog;
use App\Services\AuditService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Redis;
use Laravel\Sanctum\Sanctum;
use Tests\CreatesDomain;
use Tests\TestCase;

class OperationsTest extends TestCase
{
    use CreatesDomain,RefreshDatabase;

    public function test_announcement_publish_public_window_and_event(): void
    {
        Event::fake([AnnouncementPublished::class]);
        $admin = $this->admin();
        Sanctum::actingAs($admin);
        $id = $this->postJson('/api/v1/admin/announcements', ['title' => 'بازار', 'body' => 'فعال', 'starts_at' => now()->subMinute()->toIso8601String(), 'ends_at' => now()->addHour()->toIso8601String()])->assertCreated()->json('data.id');
        $this->getJson('/api/v1/announcements/current')->assertJsonCount(0, 'data');
        $this->postJson("/api/v1/admin/announcements/$id/publish")->assertOk();
        $this->getJson('/api/v1/announcements/current')->assertJsonPath('data.0.body', 'فعال');
        Event::assertDispatched(AnnouncementPublished::class);
    }

    public function test_presence_uses_redis_ttl_and_admin_can_list_and_count(): void
    {
        $customer = $this->customer();
        Redis::del('presence:online');
        Redis::del(config('shahrazgold.presence.key_prefix').$customer->id);
        Sanctum::actingAs($customer);
        $this->withServerVariables(['REMOTE_ADDR' => '203.0.113.42'])
            ->postJson('/api/v1/presence/heartbeat')
            ->assertOk()
            ->assertJsonPath('data.ttl_seconds', 90);
        $this->assertGreaterThan(0, Redis::ttl(config('shahrazgold.presence.key_prefix').$customer->id));
        Sanctum::actingAs($this->admin());
        $this->getJson('/api/v1/admin/presence')
            ->assertOk()
            ->assertJsonPath('data.count', 1)
            ->assertJsonPath('data.users.0.ip_address', '203.0.113.42');
        $this->getJson('/api/v1/admin/presence/count')->assertJsonPath('data.count', 1);
    }

    public function test_audit_service_removes_sensitive_values(): void
    {
        $user = $this->admin();
        app(AuditService::class)->record('test', $user, null, ['password' => 'secret', 'token' => 'abc', 'mobile' => $user->mobile], $user->id);
        $log = AuditLog::first();
        $this->assertArrayNotHasKey('password', $log->new_values);
        $this->assertArrayNotHasKey('token', $log->new_values);
        $this->assertSame($user->mobile, $log->new_values['mobile']);
    }

    public function test_dashboard_and_reports_are_admin_only_and_support_dates(): void
    {
        Sanctum::actingAs($this->customer());
        $this->getJson('/api/v1/admin/dashboard')->assertForbidden();
        Sanctum::actingAs($this->admin());
        $this->getJson('/api/v1/admin/dashboard?date_from='.today()->toDateString().'&date_to='.today()->toDateString())->assertOk()->assertJsonStructure(['data' => ['total_users', 'active_users', 'online_users', 'pending_requests', 'completed_buy_total_rial', 'latest_requests', 'latest_prices', 'active_announcement']]);
        $this->getJson('/api/v1/admin/reports/purchase-requests')->assertOk();
        $this->getJson('/api/v1/admin/reports/price-history')->assertOk();
    }
}
