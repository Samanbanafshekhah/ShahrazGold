<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;

class LoginRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return ['mobile' => ['required', 'regex:/^09\d{9}$/'], 'password' => ['required', 'string'], 'device_name' => ['nullable', 'string', 'max:100']];
    }
}
