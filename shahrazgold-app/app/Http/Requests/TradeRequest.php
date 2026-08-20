<?php

namespace App\Http\Requests;

use App\Enums\EntryMode;
use App\Enums\ProductUnit;
use App\Enums\TradeType;
use App\Models\Product;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class TradeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'product_id' => ['required', 'integer', 'exists:products,id'], 'trade_type' => ['required', Rule::enum(TradeType::class)], 'entry_mode' => ['required', Rule::enum(EntryMode::class)],
            'quantity' => ['required_if:entry_mode,quantity', 'prohibited_if:entry_mode,amount', 'numeric', 'gt:0', 'decimal:0,6'],
            'amount_rial' => ['required_if:entry_mode,amount', 'prohibited_if:entry_mode,quantity', 'integer', 'min:1', 'max:9223372036854775807'],
            'raw_unit_price_rial' => ['prohibited'], 'final_unit_price_rial' => ['prohibited'], 'adjustment_percent' => ['prohibited'],
        ];
    }

    public function after(): array
    {
        return [function (Validator $validator) {
            $product = Product::find($this->integer('product_id'));
            if (! $product) {
                return;
            }
            if (! $product->is_active) {
                $validator->errors()->add('product_id', 'Product is inactive.');
            }
            if ($this->string('trade_type')->value() === TradeType::CustomerBuy->value && ! $product->is_buyable) {
                $validator->errors()->add('trade_type', 'Product is not buyable.');
            }
            if ($this->string('trade_type')->value() === TradeType::CustomerSell->value && ! $product->is_sellable) {
                $validator->errors()->add('trade_type', 'Product is not sellable.');
            }
            if ($product->unit === ProductUnit::Count && $this->string('entry_mode')->value() === EntryMode::Quantity->value && ! preg_match('/^[1-9]\d*$/', (string) $this->input('quantity'))) {
                $validator->errors()->add('quantity', 'Count products require a whole quantity.');
            }
            if ($product->unit === ProductUnit::Count && $this->string('entry_mode')->value() === EntryMode::Amount->value) {
                $validator->errors()->add('entry_mode', 'Count products only support quantity entry mode.');
            }
        }];
    }
}
