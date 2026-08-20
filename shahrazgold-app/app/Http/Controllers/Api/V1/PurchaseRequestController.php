<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\PurchaseRequestStatus;
use App\Exceptions\PriceChangedException;
use App\Http\Controllers\Controller;
use App\Http\Requests\PurchaseRequestStoreRequest;
use App\Http\Resources\PurchaseRequestResource;
use App\Models\PurchaseRequest;
use App\Services\PurchaseRequestService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PurchaseRequestController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $p = PurchaseRequest::query()->where('user_id', $request->user()->id)->orderByDesc('id')->paginate(min($request->integer('per_page', 15), 100));

        return $this->paginated($p, fn ($x) => (new PurchaseRequestResource($x))->resolve());
    }

    public function store(PurchaseRequestStoreRequest $request, PurchaseRequestService $service): JsonResponse
    {
        try {
            $trade = $service->create($request->user(), $request->validated());
        } catch (PriceChangedException $e) {
            return response()->json(['success' => false, 'message' => 'PRICE_CHANGED', 'data' => ['preview' => $e->preview], 'errors' => null], 409);
        }

        return $this->success((new PurchaseRequestResource($trade))->resolve(), 'Purchase request created.', 201);
    }

    public function show(Request $request, PurchaseRequest $purchaseRequest): JsonResponse
    {
        $this->authorize('view', $purchaseRequest);

        return $this->success((new PurchaseRequestResource($purchaseRequest->load('histories')))->resolve());
    }

    public function cancel(Request $request, PurchaseRequest $purchaseRequest, PurchaseRequestService $service): JsonResponse
    {
        $this->authorize('cancel', $purchaseRequest);
        $r = $service->transition($purchaseRequest, PurchaseRequestStatus::Cancelled, $request->user());

        return $this->success((new PurchaseRequestResource($r))->resolve(), 'Request cancelled.');
    }
}
