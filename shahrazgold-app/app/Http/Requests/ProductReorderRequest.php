<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ProductReorderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->canReorderProducts() === true;
    }

    public function rules(): array
    {
        return [
            'product_ids' => ['required', 'array', 'min:1'],
            'product_ids.*' => [
                'required',
                'integer',
                'distinct:strict',
                Rule::exists('products', 'id')->whereNull('deleted_at'),
            ],
        ];
    }
}
