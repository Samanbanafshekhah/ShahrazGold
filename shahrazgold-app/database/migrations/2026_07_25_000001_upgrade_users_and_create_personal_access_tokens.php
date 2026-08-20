<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('first_name')->nullable()->after('id');
            $table->string('last_name')->nullable()->after('first_name');
            $table->string('mobile', 11)->nullable()->after('last_name');
            $table->string('role', 20)->default('customer')->after('password');
            $table->boolean('is_active')->default(true)->after('role');
            $table->timestampTz('mobile_verified_at')->nullable()->after('is_active');
            $table->timestampTz('last_login_at')->nullable()->after('mobile_verified_at');
            $table->softDeletesTz();
            $table->index(['role', 'is_active']);
        });

        DB::table('users')->whereNull('first_name')->update([
            'first_name' => DB::raw("COALESCE(NULLIF(name, ''), 'User')"),
            'last_name' => '',
        ]);

        Schema::table('users', function (Blueprint $table) {
            $table->dropUnique('users_email_unique');
            $table->string('email')->nullable()->change();
            $table->dropColumn(['name', 'email_verified_at']);
            $table->unique('mobile');
            $table->unique('email');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->string('first_name')->nullable(false)->change();
            $table->string('last_name')->nullable(false)->change();
        });

        Schema::create('personal_access_tokens', function (Blueprint $table) {
            $table->id();
            $table->morphs('tokenable');
            $table->text('name');
            $table->string('token', 64)->unique();
            $table->text('abilities')->nullable();
            $table->timestampTz('last_used_at')->nullable();
            $table->timestampTz('expires_at')->nullable()->index();
            $table->timestampsTz();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('personal_access_tokens');
        Schema::table('users', function (Blueprint $table) {
            $table->string('name')->nullable();
            $table->timestamp('email_verified_at')->nullable();
            $table->dropUnique(['mobile']);
            $table->dropIndex(['role', 'is_active']);
            $table->dropColumn(['first_name', 'last_name', 'mobile', 'role', 'is_active', 'mobile_verified_at', 'last_login_at', 'deleted_at']);
        });
    }
};
