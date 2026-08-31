<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class TradeAvailabilityRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isAdmin() === true;
    }

    public function rules(): array
    {
        return [
            'buy_disabled' => ['required_without:sell_disabled', 'boolean'],
            'sell_disabled' => ['required_without:buy_disabled', 'boolean'],
        ];
    }
}
