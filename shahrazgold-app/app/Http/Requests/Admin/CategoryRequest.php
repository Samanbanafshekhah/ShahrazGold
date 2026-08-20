<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CategoryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isAdmin() === true;
    }

    public function rules(): array
    {
        $model = $this->route('category');
        $id = is_object($model) ? $model->id : $model;

        return ['title' => ['required', 'string', 'max:255'], 'slug' => ['nullable', 'string', 'max:255', Rule::unique('product_categories')->ignore($id)], 'description' => ['nullable', 'string'], 'icon' => ['nullable', 'string', 'max:255'], 'image' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'], 'is_active' => ['sometimes', 'boolean'], 'display_order' => ['sometimes', 'integer', 'min:0']];
    }
}
