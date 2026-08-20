<?php

namespace Database\Seeders;

use App\Enums\AnnouncementStatus;
use App\Enums\EntryMode;
use App\Enums\PricingMode;
use App\Enums\ProductUnit;
use App\Enums\PurchaseRequestStatus;
use App\Enums\TradeType;
use App\Enums\UserRole;
use App\Models\AppSetting;
use App\Models\MarketAnnouncement;
use App\Models\MarketPriceSource;
use App\Models\Product;
use App\Models\ProductCategory;
use App\Models\Role;
use App\Models\User;
use App\Services\Pricing\ProductPricingService;
use App\Services\PurchaseRequestService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        abort_if(app()->environment('production'), 1, 'Development seed data must not run in production.');

        $admin = User::firstOrCreate(['mobile' => '09120000001'], ['first_name' => 'مدیر', 'last_name' => 'آزمایشی', 'email' => 'admin@example.test', 'password' => Hash::make(Str::random(40)), 'role' => UserRole::Admin, 'is_active' => true]);
        $customer = User::firstOrCreate(['mobile' => '09120000002'], ['first_name' => 'مشتری', 'last_name' => 'آزمایشی', 'email' => 'customer@example.test', 'password' => Hash::make(Str::random(40)), 'role' => UserRole::Customer, 'is_active' => true]);
        $categories = collect([['طلا', 'gold'], ['طلای آب‌شده', 'melted-gold'], ['سکه', 'coin'], ['نقره', 'silver']])->mapWithKeys(fn ($x, $i) => [$x[1] => ProductCategory::firstOrCreate(['slug' => $x[1]], ['title' => $x[0], 'is_active' => true, 'display_order' => $i])]);
        $source = MarketPriceSource::firstOrCreate(['code' => 'GOLD_MESGHAL_17'], ['title' => 'مظنه طلای ۱۷ عیار', 'unit' => ProductUnit::Mithqal, 'is_active' => true]);
        $specs = [
            ['طلای ۱۸ عیار', 'gold-18', 'GOLD18', 'gold', ProductUnit::Gram, PricingMode::Derived, $source->id, 'gold18_from_mesghal', true, '1.00'],
            ['طلای ۲۴ عیار', 'gold-24', 'GOLD24', 'gold', ProductUnit::Gram, PricingMode::Manual, null, null, false, '0'],
            ['طلای آب‌شده', 'melted-gold-product', 'MELTED', 'melted-gold', ProductUnit::Gram, PricingMode::Manual, null, null, false, '0'],
            ['مثقال طلا', 'gold-mithqal', 'MITHQAL', 'gold', ProductUnit::Mithqal, PricingMode::Manual, null, null, false, '0'],
            ['سکه امامی', 'emami-coin', 'EMAMI', 'coin', ProductUnit::Count, PricingMode::Manual, null, null, false, '0'],
            ['نیم سکه', 'half-coin', 'HALF', 'coin', ProductUnit::Count, PricingMode::Manual, null, null, false, '0'],
            ['ربع سکه', 'quarter-coin', 'QUARTER', 'coin', ProductUnit::Count, PricingMode::Manual, null, null, false, '0'],
            ['سکه گرمی', 'gram-coin', 'GRAMCOIN', 'coin', ProductUnit::Count, PricingMode::Manual, null, null, false, '0'],
        ];
        $products = collect($specs)->map(fn ($s, $i) => Product::firstOrCreate(['symbol' => $s[2]], ['name' => $s[0], 'slug' => $s[1], 'product_category_id' => $categories[$s[3]]->id, 'unit' => $s[4], 'pricing_mode' => $s[5], 'price_source_id' => $s[6], 'pricing_formula_key' => $s[7], 'is_active' => true, 'is_buyable' => true, 'is_sellable' => true, 'display_order' => $i, 'trade_adjustment_enabled' => $s[8], 'trade_adjustment_percent' => $s[9]]));

        $adminRole = Role::query()->where('slug', UserRole::Admin->value)->firstOrFail();
        $customerRole = Role::query()->where('slug', UserRole::Customer->value)->firstOrFail();
        $admin->forceFill(['role_id' => $adminRole->id])->save();
        $customer->forceFill(['role_id' => $customerRole->id])->save();

        $productPermissions = $products->mapWithKeys(fn (Product $product) => [
            $product->id => [
                'can_access' => true,
                'can_buy' => (bool) $product->is_buyable,
            ],
        ])->all();
        $adminRole->products()->sync($productPermissions);
        $customerRole->products()->sync($productPermissions);
        AppSetting::setManagerOnline(true);

        $pricing = app(ProductPricingService::class);
        if ($source->quotes()->count() < 2) {
            $pricing->createQuote($source, '300000000', 'Development quote 1', (int) $admin->id);
            $pricing->createQuote($source, '305000000', 'Development quote 2', (int) $admin->id);
        }
        foreach ($products->filter(fn ($p) => $p->pricing_mode === PricingMode::Manual) as $i => $product) {
            if (! $product->prices()->exists()) {
                $pricing->createManualPrice($product, (string) (70000000 + ($i * 10000000)), (int) $admin->id);
            }
        }

        $gold18 = $products->firstWhere('symbol', 'GOLD18');
        if ($customer->purchaseRequests()->count() === 0) {
            $trade = app(PurchaseRequestService::class)->create($customer, ['product_id' => $gold18->id, 'trade_type' => TradeType::CustomerBuy->value, 'entry_mode' => EntryMode::Quantity->value, 'quantity' => '1.250000', 'client_reference' => (string) Str::uuid(), 'expected_product_price_id' => $gold18->currentPrice()->first()->id, 'user_note' => 'درخواست توسعه']);
            app(PurchaseRequestService::class)->transition($trade, PurchaseRequestStatus::Approved, $admin, 'تأیید آزمایشی');
            app(PurchaseRequestService::class)->transition($trade, PurchaseRequestStatus::Completed, $admin, 'تکمیل آزمایشی');
        }
        if ($customer->purchaseRequests()->count() === 1) {
            app(PurchaseRequestService::class)->create($customer, ['product_id' => $gold18->id, 'trade_type' => TradeType::CustomerSell->value, 'entry_mode' => EntryMode::Quantity->value, 'quantity' => '0.750000', 'client_reference' => (string) Str::uuid(), 'expected_product_price_id' => $gold18->currentPrice()->first()->id, 'user_note' => 'درخواست در انتظار']);
        }
        if ($customer->purchaseRequests()->count() === 2) {
            $manual = $products->first(fn ($product) => $product->pricing_mode === PricingMode::Manual && $product->unit !== ProductUnit::Count);
            $rejected = app(PurchaseRequestService::class)->create($customer, ['product_id' => $manual->id, 'trade_type' => TradeType::CustomerBuy->value, 'entry_mode' => EntryMode::Amount->value, 'amount_rial' => '250000000', 'client_reference' => (string) Str::uuid(), 'expected_product_price_id' => $manual->currentPrice()->first()->id, 'user_note' => 'درخواست ردشونده']);
            app(PurchaseRequestService::class)->transition($rejected, PurchaseRequestStatus::Rejected, $admin, 'رد آزمایشی');
        }
        MarketAnnouncement::firstOrCreate(['body' => 'بازار فعال است.'], ['title' => 'اطلاعیه نمونه', 'status' => AnnouncementStatus::Published, 'published_at' => now(), 'created_by' => $admin->id, 'updated_by' => $admin->id]);
    }
}
