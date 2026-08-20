<?php

namespace App\Http\Controllers;

use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Pagination\LengthAwarePaginator;

abstract class Controller
{
    use AuthorizesRequests;

    protected function success(mixed $data = null, string $message = 'OK', int $status = 200, array $meta = []): JsonResponse
    {
        return response()->json(['success' => true, 'message' => $message, 'data' => $data, 'meta' => (object) $meta], $status);
    }

    protected function paginated(LengthAwarePaginator $paginator, callable $map, string $message = 'OK'): JsonResponse
    {
        return $this->success($paginator->getCollection()->map($map)->values(), $message, 200, [
            'current_page' => $paginator->currentPage(), 'per_page' => $paginator->perPage(), 'last_page' => $paginator->lastPage(), 'total' => $paginator->total(),
        ]);
    }
}
