<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuditLogController extends Controller
{
    public function index(Request $r): JsonResponse
    {
        $q = AuditLog::query()->when($r->filled('event'), fn ($x) => $x->where('event', $r->event))->when($r->filled('actor_id'), fn ($x) => $x->where('actor_id', $r->actor_id))->when($r->filled('date_from'), fn ($x) => $x->whereDate('created_at', '>=', $r->date_from))->when($r->filled('date_to'), fn ($x) => $x->whereDate('created_at', '<=', $r->date_to))->orderByDesc('id');
        $p = $q->paginate(min($r->integer('per_page', 25), 100));

        return $this->paginated($p, fn ($a) => ['id' => $a->id, 'actor_id' => $a->actor_id, 'event' => $a->event, 'subject_type' => $a->subject_type, 'subject_id' => $a->subject_id, 'old_values' => $a->old_values, 'new_values' => $a->new_values, 'ip_address' => $a->ip_address, 'request_id' => $a->request_id, 'created_at' => $a->created_at->utc()->toIso8601String()]);
    }
}
