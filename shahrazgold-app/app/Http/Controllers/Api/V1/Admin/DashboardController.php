<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\AnnouncementStatus;
use App\Enums\PurchaseRequestStatus;
use App\Enums\TradeType;
use App\Http\Controllers\Controller;
use App\Http\Resources\ProductPriceResource;
use App\Http\Resources\PurchaseRequestResource;
use App\Models\MarketAnnouncement;
use App\Models\ProductPrice;
use App\Models\PurchaseRequest;
use App\Models\User;
use App\Services\PresenceService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function __invoke(Request $r, PresenceService $presence): JsonResponse
    {
        $stats = PurchaseRequest::query()->when($r->filled('date_from'), fn ($q) => $q->whereDate('created_at', '>=', $r->date_from))->when($r->filled('date_to'), fn ($q) => $q->whereDate('created_at', '<=', $r->date_to));
        $active = MarketAnnouncement::query()->where('status', AnnouncementStatus::Published)->where(fn ($q) => $q->whereNull('starts_at')->orWhere('starts_at', '<=', now()))->where(fn ($q) => $q->whereNull('ends_at')->orWhere('ends_at', '>=', now()))->latest('published_at')->first();
        $data = ['total_users' => User::count(), 'active_users' => User::where('is_active', true)->count(), 'online_users' => $presence->count(), 'pending_requests' => (clone $stats)->where('status', PurchaseRequestStatus::Pending)->count(), 'today_requests' => PurchaseRequest::whereDate('created_at', today())->count(), 'approved_requests' => (clone $stats)->where('status', PurchaseRequestStatus::Approved)->count(), 'rejected_requests' => (clone $stats)->where('status', PurchaseRequestStatus::Rejected)->count(), 'completed_requests' => (clone $stats)->where('status', PurchaseRequestStatus::Completed)->count(), 'completed_buy_total_rial' => (string) (clone $stats)->where('status', PurchaseRequestStatus::Completed)->where('trade_type', TradeType::CustomerBuy)->sum('total_amount_rial'), 'completed_sell_total_rial' => (string) (clone $stats)->where('status', PurchaseRequestStatus::Completed)->where('trade_type', TradeType::CustomerSell)->sum('total_amount_rial'), 'latest_requests' => PurchaseRequestResource::collection(PurchaseRequest::with('user')->latest()->limit(10)->get())->resolve(), 'latest_prices' => ProductPriceResource::collection(ProductPrice::with('product')->orderByDesc('effective_at')->orderByDesc('id')->limit(10)->get())->resolve(), 'active_announcement' => $active ? ['id' => $active->id, 'title' => $active->title, 'body' => $active->body] : null];

        return $this->success($data);
    }
}
