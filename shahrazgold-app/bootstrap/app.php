<?php

use App\Exceptions\KavenegarException;
use App\Http\Middleware\EnsureUserIsActive;
use App\Http\Middleware\EnsureUserIsAdmin;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withBroadcasting(__DIR__.'/../routes/channels.php', [
        'prefix' => 'api',
        'middleware' => ['api', 'auth:sanctum', 'active'],
    ])
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias([
            'active' => EnsureUserIsActive::class,
            'admin' => EnsureUserIsAdmin::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*'),
        );

        $exceptions->render(function (ValidationException $e, Request $request) {
            if (! $request->is('api/*')) {
                return null;
            }

            return response()->json([
                'success' => false,
                'message' => 'اطلاعات واردشده معتبر نیست.',
                'data' => null,
                'errors' => $e->errors(),
            ], 422);
        });

        $exceptions->render(function (AuthenticationException $e, Request $request) {
            if (! $request->is('api/*')) {
                return null;
            }

            return response()->json([
                'success' => false,
                'message' => 'نشست شما منقضی شده است؛ دوباره وارد شوید.',
                'data' => null,
                'errors' => null,
            ], 401);
        });

        $exceptions->render(function (KavenegarException $e, Request $request) {
            if (! $request->is('api/*')) {
                return null;
            }

            report($e);

            return response()->json([
                'success' => false,
                'message' => 'ارسال پیامک در حال حاضر ممکن نیست؛ کمی بعد دوباره تلاش کنید.',
                'data' => null,
                'errors' => null,
            ], 503);
        });

        $exceptions->render(function (Throwable $e, Request $request) {
            if (! $request->is('api/*') || ! $e instanceof HttpExceptionInterface) {
                return null;
            }

            return response()->json([
                'success' => false,
                'message' => $e->getMessage() ?: match ($e->getStatusCode()) {
                    403 => 'اجازه انجام این عملیات را ندارید.',
                    404 => 'اطلاعات موردنظر پیدا نشد.',
                    409 => 'تداخل در انجام عملیات رخ داد.',
                    429 => 'تعداد درخواست‌ها زیاد است؛ کمی بعد دوباره تلاش کنید.',
                    default => 'انجام درخواست ناموفق بود.',
                },
                'data' => null,
                'errors' => null,
            ], $e->getStatusCode());
        });
    })->create();
