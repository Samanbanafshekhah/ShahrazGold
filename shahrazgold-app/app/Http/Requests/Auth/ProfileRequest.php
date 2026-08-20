<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ProfileRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return ['first_name' => ['required', 'string', 'max:100'], 'last_name' => ['required', 'string', 'max:100'], 'mobile' => ['required', 'regex:/^09\d{9}$/', Rule::unique('users')->ignore($this->user()->id)], 'email' => ['nullable', 'email:rfc', 'max:255', Rule::unique('users')->ignore($this->user()->id)], 'role' => ['prohibited'], 'is_active' => ['prohibited']];
    }
}
