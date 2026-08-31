<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\AnnouncementStatus;
use App\Events\AnnouncementPublished;
use App\Events\AnnouncementUnpublished;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\AnnouncementRequest;
use App\Models\MarketAnnouncement;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AnnouncementController extends Controller
{
    public function index(Request $r): JsonResponse
    {
        $p = MarketAnnouncement::query()->when($r->filled('status'), fn ($x) => $x->where('status', $r->status))->orderByDesc('id')->paginate(min($r->integer('per_page', 15), 100));

        return $this->paginated($p, fn ($a) => $this->data($a));
    }

    public function store(AnnouncementRequest $r, AuditService $audit): JsonResponse
    {
        $a = MarketAnnouncement::create(array_merge($r->validated(), ['status' => AnnouncementStatus::Draft, 'created_by' => $r->user()->id, 'updated_by' => $r->user()->id]));
        $audit->record('announcement.created', $a, null, $a->toArray());

        return $this->success($this->data($a), 'Announcement created.', 201);
    }

    public function show(MarketAnnouncement $announcement): JsonResponse
    {
        return $this->success($this->data($announcement));
    }

    public function update(AnnouncementRequest $r, MarketAnnouncement $announcement, AuditService $audit): JsonResponse
    {
        $old = $announcement->toArray();
        $announcement->update(array_merge($r->validated(), ['updated_by' => $r->user()->id]));
        $audit->record('announcement.updated', $announcement, $old, $announcement->fresh()->toArray());

        return $this->success($this->data($announcement->fresh()), 'Announcement updated.');
    }

    public function destroy(MarketAnnouncement $announcement): JsonResponse
    {
        $wasPublished = $announcement->status === AnnouncementStatus::Published;
        $announcementId = $announcement->id;
        $announcement->delete();
        if ($wasPublished) {
            AnnouncementUnpublished::dispatch($announcementId);
        }

        return $this->success(null, 'Announcement deleted.');
    }

    public function publish(Request $r, MarketAnnouncement $announcement, AuditService $audit): JsonResponse
    {
        $old = $announcement->toArray();
        $announcement->update(['status' => AnnouncementStatus::Published, 'published_at' => now()->utc(), 'updated_by' => $r->user()->id]);
        $audit->record('announcement.published', $announcement, $old, $announcement->fresh()->toArray());
        AnnouncementPublished::dispatch($announcement);

        return $this->success($this->data($announcement->fresh()), 'Announcement published.');
    }

    public function unpublish(Request $r, MarketAnnouncement $announcement, AuditService $audit): JsonResponse
    {
        $old = $announcement->toArray();
        $announcement->update(['status' => AnnouncementStatus::Draft, 'published_at' => null, 'updated_by' => $r->user()->id]);
        $audit->record('announcement.unpublished', $announcement, $old, $announcement->fresh()->toArray());
        AnnouncementUnpublished::dispatch($announcement->id);

        return $this->success($this->data($announcement->fresh()), 'Announcement unpublished.');
    }

    private function data(MarketAnnouncement $a): array
    {
        return ['id' => $a->id, 'title' => $a->title, 'body' => $a->body, 'status' => $a->status->value, 'starts_at' => $a->starts_at?->utc()->toIso8601String(), 'ends_at' => $a->ends_at?->utc()->toIso8601String(), 'published_at' => $a->published_at?->utc()->toIso8601String(), 'created_at' => $a->created_at->utc()->toIso8601String()];
    }
}
