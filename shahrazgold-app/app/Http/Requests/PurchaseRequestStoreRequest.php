<?php

namespace App\Http\Requests;

class PurchaseRequestStoreRequest extends TradeRequest
{
    public function rules(): array
    {
        return array_merge(parent::rules(), ['client_reference' => ['required', 'uuid'], 'expected_product_price_id' => ['required', 'integer', 'exists:product_prices,id'], 'user_note' => ['nullable', 'string', 'max:2000']]);
    }
}
