<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\PurchaseRequestStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\TransitionRequest;
use App\Http\Resources\PurchaseRequestResource;
use App\Models\PurchaseRequest;
use App\Services\PurchaseRequestService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PurchaseRequestController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $q = PurchaseRequest::with('user');
        $q->when($request->filled('request_number'), fn ($x) => $x->whereLike('request_number', '%'.$request->request_number.'%'))->when($request->filled('user_id'), fn ($x) => $x->where('user_id', $request->user_id))
            ->when($request->filled('mobile'), fn ($x) => $x->whereHas('user', fn ($u) => $u->whereLike('mobile', '%'.$request->mobile.'%')))->when($request->filled('product_id'), fn ($x) => $x->where('product_id', $request->product_id))
            ->when($request->filled('trade_type'), fn ($x) => $x->where('trade_type', $request->trade_type))->when($request->filled('status'), fn ($x) => $x->where('status', $request->status))
            ->when($request->filled('date_from'), fn ($x) => $x->whereDate('created_at', '>=', $request->date_from))->when($request->filled('date_to'), fn ($x) => $x->whereDate('created_at', '<=', $request->date_to))
            ->when($request->filled('min_amount_rial'), fn ($x) => $x->where('total_amount_rial', '>=', $request->min_amount_rial))->when($request->filled('max_amount_rial'), fn ($x) => $x->where('total_amount_rial', '<=', $request->max_amount_rial))
            ->orderBy('created_at', $request->input('sort') === 'oldest' ? 'asc' : 'desc');

        return $this
            ->paginated($q->paginate(min($request->integer('per_page', 15), 100)), fn ($x) => (new PurchaseRequestResource($x))->resolve())
            ->header('Cache-Control', 'no-store, no-cache, must-revalidate, private')
            ->header('Pragma', 'no-cache');
    }

    public function show(PurchaseRequest $purchaseRequest): JsonResponse
    {
        return $this->success((new PurchaseRequestResource($purchaseRequest->load(['user', 'histories'])))->resolve());
    }

    public function approve(TransitionRequest $request, PurchaseRequest $purchaseRequest, PurchaseRequestService $s): JsonResponse
    {
        return $this->changed($s->transition($purchaseRequest, PurchaseRequestStatus::Approved, $request->user(), $request->note), 'approved');
    }

    public function reject(TransitionRequest $request, PurchaseRequest $purchaseRequest, PurchaseRequestService $s): JsonResponse
    {
        return $this->changed($s->transition($purchaseRequest, PurchaseRequestStatus::Rejected, $request->user(), $request->note), 'rejected');
    }

    public function complete(TransitionRequest $request, PurchaseRequest $purchaseRequest, PurchaseRequestService $s): JsonResponse
    {
        return $this->changed($s->transition($purchaseRequest, PurchaseRequestStatus::Completed, $request->user(), $request->note), 'completed');
    }

    private function changed(PurchaseRequest $r, string $message): JsonResponse
    {
        return $this->success((new PurchaseRequestResource($r))->resolve(), 'Request '.$message.'.');
    }
}
