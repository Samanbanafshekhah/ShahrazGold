<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\AnnouncementStatus;
use App\Http\Controllers\Controller;
use App\Models\MarketAnnouncement;
use Illuminate\Http\JsonResponse;

class AnnouncementController extends Controller
{
    public function current(): JsonResponse
    {
        $now = now()->utc();
        $items = MarketAnnouncement::query()->where('status', AnnouncementStatus::Published)->where(fn ($q) => $q->whereNull('starts_at')->orWhere('starts_at', '<=', $now))->where(fn ($q) => $q->whereNull('ends_at')->orWhere('ends_at', '>=', $now))->orderByDesc('published_at')->get();

        return $this->success($items->map(fn ($a) => ['id' => $a->id, 'title' => $a->title, 'body' => $a->body, 'starts_at' => $a->starts_at?->utc()->toIso8601String(), 'ends_at' => $a->ends_at?->utc()->toIso8601String(), 'published_at' => $a->published_at?->utc()->toIso8601String()]));
    }
}
