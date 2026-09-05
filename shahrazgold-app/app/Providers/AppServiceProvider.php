<?php

namespace App\Providers;

use App\Contracts\PriceFormulaInterface;
use App\Services\Pricing\Formulas\Gold18FromMesghalFormula;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->bind(PriceFormulaInterface::class, Gold18FromMesghalFormula::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        RateLimiter::for('login', fn (Request $request) => Limit::perMinute(5)->by($request->ip().'|'.$request->string('mobile')));
        RateLimiter::for('register', fn (Request $request) => Limit::perMinute(3)->by($request->ip().'|'.$request->string('mobile')));
        RateLimiter::for('otp-verify', fn (Request $request) => Limit::perMinute(10)->by($request->ip().'|'.$request->string('registration_token')));
        RateLimiter::for('otp-resend', fn (Request $request) => Limit::perMinute(2)->by($request->ip().'|'.$request->string('registration_token')));
        RateLimiter::for('password-reset', fn (Request $request) => [
            Limit::perMinute(3)->by($request->ip().'|'.$request->string('mobile')),
            Limit::perMinute(10)->by($request->ip()),
        ]);
        RateLimiter::for('password-reset-verify', fn (Request $request) => Limit::perMinute(10)->by($request->ip().'|'.$request->string('reset_token')));
        RateLimiter::for('password-reset-resend', fn (Request $request) => Limit::perMinute(2)->by($request->ip().'|'.$request->string('reset_token')));
        RateLimiter::for('price-write', fn () => Limit::none());
        RateLimiter::for('trade-preview', fn (Request $request) => Limit::perMinute(60)->by((string) optional($request->user())->id ?: $request->ip()));
        RateLimiter::for('trade-create', fn (Request $request) => Limit::perMinute(20)->by((string) optional($request->user())->id ?: $request->ip()));
        RateLimiter::for('presence', fn (Request $request) => Limit::perMinute(6)->by((string) optional($request->user())->id ?: $request->ip()));
    }
}
