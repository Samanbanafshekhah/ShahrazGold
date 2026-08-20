<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\CreatesDomain;
use Tests\TestCase;

class AuthenticationAndAccessTest extends TestCase
{
    use CreatesDomain,RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withServerVariables(['REMOTE_ADDR' => '10.99.'.random_int(1, 254).'.'.random_int(1, 254)]);
    }

    private function registration(array $extra = []): array
    {
        return array_merge(['first_name' => 'Ali', 'last_name' => 'Ahmadi', 'mobile' => '09123456789', 'email' => 'ali@example.test', 'password' => 'secret123', 'password_confirmation' => 'secret123'], $extra);
    }

    public function test_customer_registration_issues_token_and_cannot_choose_admin_role(): void
    {
        $this->postJson('/api/v1/auth/register', $this->registration(['role' => 'admin']))->assertStatus(422);
        $this->postJson('/api/v1/auth/register', $this->registration())->assertCreated()->assertJsonPath('data.user.role', 'customer')->assertJsonStructure(['data' => ['access_token']]);
        $this->assertSame(UserRole::Customer, User::first()->role);
    }

    public function test_duplicate_mobile_login_inactive_logout_and_rate_limit(): void
    {
        $this->postJson('/api/v1/auth/register', $this->registration())->assertCreated();
        $this->postJson('/api/v1/auth/register', $this->registration(['email' => 'other@example.test']))->assertStatus(422);
        $login = $this->postJson('/api/v1/auth/login', ['mobile' => '09123456789', 'password' => 'secret123'])->assertOk();
        $token = $login->json('data.access_token');
        $this->withToken($token)->postJson('/api/v1/auth/logout')->assertOk();
        $this->assertDatabaseCount('personal_access_tokens', 1);
        $this->app['auth']->forgetGuards();
        $this->withToken($token)->getJson('/api/v1/auth/me')->assertUnauthorized();
        $inactive = $this->customer(['mobile' => '09121111111', 'is_active' => false]);
        $this->postJson('/api/v1/auth/login', ['mobile' => $inactive->mobile, 'password' => 'password'])->assertUnauthorized();
        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/v1/auth/login', ['mobile' => '09999999999', 'password' => 'wrong']);
        }$this->postJson('/api/v1/auth/login', ['mobile' => '09999999999', 'password' => 'wrong'])->assertStatus(429);
    }

    public function test_customer_is_denied_admin_and_admin_is_allowed(): void
    {
        Sanctum::actingAs($this->customer());
        $this->getJson('/api/v1/admin/users')->assertForbidden();
        Sanctum::actingAs($this->admin());
        $this->getJson('/api/v1/admin/users')->assertOk();
    }

    public function test_current_and_last_active_admin_are_protected(): void
    {
        $admin = $this->admin();
        Sanctum::actingAs($admin);
        $this->deleteJson('/api/v1/admin/users/'.$admin->id)->assertStatus(409);
        $other = $this->admin();
        $this->patchJson('/api/v1/admin/users/'.$other->id.'/status', ['is_active' => false])->assertOk();
        $this->patchJson('/api/v1/admin/users/'.$admin->id.'/status', ['is_active' => false])->assertStatus(409);
    }

    public function test_admin_can_create_a_user_from_the_management_api(): void
    {
        Sanctum::actingAs($this->admin());

        $this->postJson('/api/v1/admin/users', [
            'first_name' => 'کاربر',
            'last_name' => 'جدید',
            'mobile' => '09128888888',
            'email' => 'new-user@example.test',
            'password' => 'secure123',
            'password_confirmation' => 'secure123',
            'role' => 'customer',
            'is_active' => true,
        ])->assertCreated()
            ->assertJsonPath('data.mobile', '09128888888')
            ->assertJsonPath('data.role', 'customer')
            ->assertJsonPath('data.is_active', true);

        $user = User::where('mobile', '09128888888')->firstOrFail();
        $this->assertTrue(Hash::check('secure123', $user->password));
    }
}
