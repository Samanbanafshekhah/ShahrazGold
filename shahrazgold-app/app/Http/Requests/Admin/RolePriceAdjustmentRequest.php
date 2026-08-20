<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class RolePriceAdjustmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isAdmin() === true;
    }

    public function rules(): array
    {
        return [
            'adjustments' => ['required', 'array'],
            'adjustments.*.product_id' => ['required', 'integer', 'distinct', 'exists:products,id'],
            'adjustments.*.buy_price_adjustment_rial' => ['required', 'integer', 'between:-999999999999999,999999999999999'],
            'adjustments.*.sell_price_adjustment_rial' => ['required', 'integer', 'between:-999999999999999,999999999999999'],
        ];
    }
}
