<?php

namespace App\Http\Requests\Admin;

use App\Models\HomeGoldBinding;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class HomeGoldBindingRequest extends FormRequest
{
    protected function prepareForValidation(): void
    {
        $this->merge(HomeGoldBinding::FIXED_SETTINGS);
    }

    public function authorize(): bool
    {
        return $this->user()?->isAdmin() === true;
    }

    public function rules(): array
    {
        return [
            'commodity_id' => ['required', 'string', 'max:100'],
            'mode' => ['required', Rule::in(['disabled', 'auto'])],
            'buy_field' => ['required', Rule::in(['buyPrice', 'sellPrice'])],
            'sell_field' => ['required', Rule::in(['buyPrice', 'sellPrice'])],
            'currency_multiplier' => ['required', 'integer', Rule::in([1, 10])],
            'unit_divisor' => ['required', 'numeric', 'gt:0', 'max:1000000', 'decimal:0,6'],
            'buy_percent' => ['required', 'numeric', 'gt:-100', 'max:100', 'decimal:0,4'],
            'sell_percent' => ['required', 'numeric', 'gt:-100', 'max:100', 'decimal:0,4'],
            'buy_offset_rial' => ['required', 'integer', 'between:-1000000000000,1000000000000'],
            'sell_offset_rial' => ['required', 'integer', 'between:-1000000000000,1000000000000'],
            'interval_seconds' => ['required', 'integer', 'min:10', 'max:3600'],
            'stale_after_seconds' => ['required', 'integer', 'gte:interval_seconds', 'max:86400'],
        ];
    }
}
