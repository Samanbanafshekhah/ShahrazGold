<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\CategoryRequest;
use App\Models\ProductCategory;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class CategoryController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $q = ProductCategory::query()->orderBy('display_order')->orderBy('id');

        return $this->paginated($q->paginate(min($request->integer('per_page', 15), 100)), fn ($c) => $this->data($c));
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
