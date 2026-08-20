<?php

namespace App\Http\Requests\Admin;

use App\Enums\PricingMode;
use App\Enums\ProductUnit;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isAdmin() === true;
    }

    public function rules(): array
    {
        $model = $this->route('product');
        $id = is_object($model) ? $model->id : $model;

        return [
            'product_category_id' => ['required', 'exists:product_categories,id'], 'name' => ['required', 'string', 'max:255'],
            'slug' => ['nullable', 'string', 'max:255', Rule::unique('products')->ignore($id)], 'symbol' => ['required', 'string', 'max:100', Rule::unique('products')->ignore($id)],
            'description' => ['nullable', 'string'], 'icon' => ['nullable', 'string', 'max:255'], 'image' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
            'unit' => ['required', Rule::enum(ProductUnit::class)], 'pricing_mode' => ['required', Rule::enum(PricingMode::class)],
            'price_source_id' => ['nullable', 'exists:market_price_sources,id', 'required_if:pricing_mode,derived'],
            'pricing_formula_key' => ['nullable', 'string', 'max:100', 'required_if:pricing_mode,derived', 'prohibited_if:pricing_mode,manual', Rule::in(['gold18_from_mesghal'])],
            'is_active' => ['sometimes', 'boolean'], 'is_buyable' => ['sometimes', 'boolean'], 'is_sellable' => ['sometimes', 'boolean'], 'display_order' => ['sometimes', 'integer', 'min:0'],
            'price_step_rial' => ['sometimes', 'integer', 'min:10000'],
            'trade_adjustment_enabled' => ['sometimes', 'boolean'], 'trade_adjustment_percent' => ['required_if:trade_adjustment_enabled,true', 'numeric', 'min:0', 'lt:100', 'decimal:0,4'],
            'sell_price_difference_rial' => ['sometimes', 'integer', 'min:0'],
        ];
    }
}
