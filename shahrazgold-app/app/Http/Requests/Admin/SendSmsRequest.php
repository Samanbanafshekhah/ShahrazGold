<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SendSmsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isAdmin() === true;
    }

    public function rules(): array
    {
        return [
            'audience' => ['required', Rule::in(['selected', 'all_active'])],
            'user_ids' => ['exclude_unless:audience,selected', 'required_if:audience,selected', 'array', 'min:1'],
            'user_ids.*' => ['integer', 'distinct', Rule::exists('users', 'id')->whereNull('deleted_at')],
            'message' => ['required', 'string', 'max:1800'],
        ];
    }

    public function messages(): array
    {
        return [
            'user_ids.required_if' => 'حداقل یک کاربر را انتخاب کنید.',
            'user_ids.min' => 'حداقل یک کاربر را انتخاب کنید.',
            'message.required' => 'متن پیامک را وارد کنید.',
            'message.max' => 'متن پیامک نمی‌تواند بیشتر از ۱۸۰۰ کاراکتر باشد.',
        ];
    }
}
