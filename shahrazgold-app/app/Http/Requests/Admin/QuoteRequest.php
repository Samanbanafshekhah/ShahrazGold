<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class QuoteRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isAdmin() === true;
    }

    public function rules(): array
    {
        return ['price_rial' => ['required', 'integer', 'min:1', 'max:9223372036854775807'], 'note' => ['nullable', 'string', 'max:2000']];
    }
}
