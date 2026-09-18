<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\CategoryRequest;
use App\Models\ProductCategory;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class CategoryController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $q = ProductCategory::query()->orderBy('display_order')->orderBy('id');

        return $this->paginated($q->paginate(min($request->integer('per_page', 15), 100)), fn ($c) => $this->data($c));
    }

    public function reorder(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'category_ids' => ['required', 'array', 'min:1'],
            'category_ids.*' => [
                'required',
                'integer',
                'distinct:strict',
                Rule::exists('product_categories', 'id')->whereNull('deleted_at'),
            ],
        ]);
        $categoryIds = array_map('intval', $validated['category_ids']);
        $allCategoryIds = ProductCategory::query()
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->all();

        if (count($categoryIds) !== count($allCategoryIds)
            || array_diff($categoryIds, $allCategoryIds)
            || array_diff($allCategoryIds, $categoryIds)) {
            return response()->json([
                'message' => 'The complete category order is required.',
                'errors' => ['category_ids' => ['The complete category order is required.']],
            ], 422);
        }

        DB::transaction(function () use ($categoryIds): void {
            ProductCategory::query()->lockForUpdate()->get(['id']);

            foreach ($categoryIds as $index => $categoryId) {
                ProductCategory::query()->whereKey($categoryId)->update([
                    'display_order' => $index + 1,
                ]);
            }
        }, 3);

        return $this->success(['category_ids' => $categoryIds], 'Category order updated.');
    }

    public function store(CategoryRequest $request, AuditService $audit): JsonResponse
    {
        $data = $this->payload($request);
        $c = ProductCategory::create($data);
        $audit->record('category.created', $c, null, $c->toArray());

        return $this->success($this->data($c), 'Category created.', 201);
    }

    public function show(ProductCategory $category): JsonResponse
    {
        return $this->success($this->data($category));
    }

    public function update(CategoryRequest $request, ProductCategory $category, AuditService $audit): JsonResponse
    {
        $old = $category->toArray();
        $category->update($this->payload($request, $category));
        $audit->record('category.updated', $category, $old, $category->fresh()->toArray());

        return $this->success($this->data($category->fresh()), 'Category updated.');
    }

    public function destroy(ProductCategory $category): JsonResponse
    {
        abort_if($category->products()->where('is_active', true)->exists(), 409, 'A category with active products cannot be deleted.');
        $category->delete();

        return $this->success(null, 'Category deleted.');
    }

    private function payload(CategoryRequest $request, ?ProductCategory $category = null): array
    {
        $d = $request->safe()->except('image');
        $d['slug'] = $d['slug'] ?? Str::slug($d['title']);
        if ($request->hasFile('image')) {
            $d['image_path'] = $request->file('image')->store('categories', 'public');
        }

        return $d;
    }

    private function data(ProductCategory $c): array
    {
        return ['id' => $c->id, 'title' => $c->title, 'slug' => $c->slug, 'description' => $c->description, 'icon' => $c->icon, 'image_url' => $c->image_path ? url('storage/'.$c->image_path) : null, 'is_active' => $c->is_active, 'display_order' => $c->display_order, 'created_at' => $c->created_at->utc()->toIso8601String()];
    }
}
