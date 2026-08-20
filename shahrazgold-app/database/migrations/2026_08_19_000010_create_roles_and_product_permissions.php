<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('roles', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100);
            $table->string('slug', 100)->unique();
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('role_product_permissions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('role_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->boolean('can_access')->default(true);
            $table->boolean('can_buy')->default(false);
            $table->timestamps();
            $table->unique(['role_id', 'product_id']);
        });

        DB::table('roles')->insert([
            ['name' => 'مدیر', 'slug' => 'admin', 'description' => 'دسترسی کامل به پنل و محصولات', 'is_active' => true, 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'مشتری', 'slug' => 'customer', 'description' => 'نقش پیش‌فرض مشتریان', 'is_active' => true, 'created_at' => now(), 'updated_at' => now()],
        ]);

        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('role_id')->nullable()->after('role')->constrained('roles')->nullOnDelete();
        });

        $admin = DB::table('roles')->where('slug', 'admin')->value('id');
        $customer = DB::table('roles')->where('slug', 'customer')->value('id');
        DB::table('users')->where('role', 'admin')->update(['role_id' => $admin]);
        DB::table('users')->where('role', 'customer')->update(['role_id' => $customer]);
    }

    public function down(): void
    {
        Schema::table('users', fn (Blueprint $table) => $table->dropConstrainedForeignId('role_id'));
        Schema::dropIfExists('role_product_permissions');
        Schema::dropIfExists('roles');
    }
};
