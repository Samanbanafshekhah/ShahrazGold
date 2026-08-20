<?php

namespace App\Http\Requests\Admin;

use App\Enums\UserRole;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class UserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isAdmin() === true;
    }

    public function rules(): array
    {
        $target = $this->route('user');
        $id = is_object($target) ? $target->id : $target;

        return [
            'first_name' => ['required', 'string', 'max:100'], 'last_name' => ['required', 'string', 'max:100'],
            'mobile' => ['required', 'regex:/^09\d{9}$/', Rule::unique('users')->ignore($id)],
            'email' => ['nullable', 'email:rfc', 'max:255', Rule::unique('users')->ignore($id)],
            'password' => [$this->isMethod('post') ? 'required' : 'nullable', 'confirmed', Password::min(8)],
            'role' => ['required', Rule::enum(UserRole::class)], 'role_id' => ['nullable', 'integer', 'exists:roles,id'], 'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
