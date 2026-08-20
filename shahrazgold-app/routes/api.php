<?php

use App\Http\Controllers\Api\V1\Admin\AnnouncementController as AdminAnnouncementController;
use App\Http\Controllers\Api\V1\Admin\AuditLogController;
use App\Http\Controllers\Api\V1\Admin\CategoryController as AdminCategoryController;
use App\Http\Controllers\Api\V1\Admin\DashboardController;
use App\Http\Controllers\Api\V1\Admin\MarketPriceSourceController;
use App\Http\Controllers\Api\V1\Admin\PresenceController as AdminPresenceController;
use App\Http\Controllers\Api\V1\Admin\ProductController as AdminProductController;
use App\Http\Controllers\Api\V1\Admin\ProductPriceController;
use App\Http\Controllers\Api\V1\Admin\PurchaseRequestController as AdminPurchaseRequestController;
use App\Http\Controllers\Api\V1\Admin\ReportController;
use App\Http\Controllers\Api\V1\Admin\RoleController;
use App\Http\Controllers\Api\V1\Admin\UserController;
use App\Http\Controllers\Api\V1\AnnouncementController;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\CatalogController;
use App\Http\Controllers\Api\V1\ManagerStatusController;
use App\Http\Controllers\Api\V1\PresenceController;
use App\Http\Controllers\Api\V1\PurchaseRequestController;
use App\Http\Controllers\Api\V1\TradeController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    Route::prefix('auth')->group(function () {
        Route::post('register', [AuthController::class, 'register'])->middleware('throttle:register');
        Route::post('login', [AuthController::class, 'login'])->middleware('throttle:login');
        Route::middleware(['auth:sanctum', 'active'])->group(function () {
            Route::post('logout', [AuthController::class, 'logout']);
            Route::post('logout-all', [AuthController::class, 'logoutAll']);
            Route::get('me', [AuthController::class, 'me']);
            Route::put('profile', [AuthController::class, 'profile']);
            Route::put('password', [AuthController::class, 'password']);
        });
    });

    Route::get('categories', [CatalogController::class, 'categories']);
    Route::get('products', [CatalogController::class, 'products']);
    Route::get('products/{product:slug}', [CatalogController::class, 'product']);
    Route::get('market/prices', [CatalogController::class, 'prices']);
    Route::get('announcements/current', [AnnouncementController::class, 'current']);
    Route::get('manager-status', [ManagerStatusController::class, 'show']);

    Route::middleware(['auth:sanctum', 'active'])->group(function () {
        Route::post('trade/preview', [TradeController::class, 'preview'])->middleware('throttle:trade-preview');
        Route::get('purchase-requests', [PurchaseRequestController::class, 'index']);
        Route::post('purchase-requests', [PurchaseRequestController::class, 'store'])->middleware('throttle:trade-create');
        Route::get('purchase-requests/{purchaseRequest}', [PurchaseRequestController::class, 'show']);
        Route::post('purchase-requests/{purchaseRequest}/cancel', [PurchaseRequestController::class, 'cancel']);
        Route::post('presence/heartbeat', [PresenceController::class, 'heartbeat'])->middleware('throttle:presence');

        Route::prefix('admin')->middleware('admin')->group(function () {
            Route::get('roles/{role}/price-adjustments', [RoleController::class, 'priceAdjustments']);
            Route::put('roles/{role}/price-adjustments', [RoleController::class, 'updatePriceAdjustments']);
            Route::apiResource('users', UserController::class);
            Route::apiResource('roles', RoleController::class)->except(['create', 'edit']);
            Route::patch('users/{user}/status', [UserController::class, 'status']);
            Route::apiResource('categories', AdminCategoryController::class);
            Route::patch('products/{product}/price-step', [AdminProductController::class, 'updatePriceStep']);
            Route::apiResource('products', AdminProductController::class);
            Route::get('products/{product}/prices', [ProductPriceController::class, 'index']);
            Route::get('products/{product}/prices/current', [ProductPriceController::class, 'current']);
            Route::post('products/{product}/prices', [ProductPriceController::class, 'store'])->middleware('throttle:price-write');
            Route::get('price-sources', [MarketPriceSourceController::class, 'index']);
            Route::get('price-sources/{source}/quotes', [MarketPriceSourceController::class, 'quotes']);
            Route::get('price-sources/{source}/quotes/current', [MarketPriceSourceController::class, 'current']);
            Route::post('price-sources/{source}/quotes', [MarketPriceSourceController::class, 'store'])->middleware('throttle:price-write');
            Route::get('purchase-requests', [AdminPurchaseRequestController::class, 'index']);
            Route::get('purchase-requests/{purchaseRequest}', [AdminPurchaseRequestController::class, 'show']);
            Route::post('purchase-requests/{purchaseRequest}/approve', [AdminPurchaseRequestController::class, 'approve']);
            Route::post('purchase-requests/{purchaseRequest}/reject', [AdminPurchaseRequestController::class, 'reject']);
            Route::post('purchase-requests/{purchaseRequest}/complete', [AdminPurchaseRequestController::class, 'complete']);
            Route::apiResource('announcements', AdminAnnouncementController::class);
            Route::post('announcements/{announcement}/publish', [AdminAnnouncementController::class, 'publish']);
            Route::post('announcements/{announcement}/unpublish', [AdminAnnouncementController::class, 'unpublish']);
            Route::get('presence', [AdminPresenceController::class, 'index']);
            Route::get('presence/count', [AdminPresenceController::class, 'count']);
            Route::get('audit-logs', [AuditLogController::class, 'index']);
            Route::get('reports/purchase-requests', [ReportController::class, 'purchaseRequests']);
            Route::get('reports/price-history', [ReportController::class, 'priceHistory']);
            Route::get('dashboard', DashboardController::class);
            Route::put('manager-status', [ManagerStatusController::class, 'update']);
        });
    });
});
