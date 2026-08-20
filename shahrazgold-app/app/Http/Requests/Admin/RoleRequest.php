<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class RoleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isAdmin() === true;
    }

    public function rules(): array
    {
        $role = $this->route('role');
        $id = is_object($role) ? $role->id : $role;

        return ['name' => ['required', 'string', 'max:100'], 'slug' => ['required', 'alpha_dash', 'max:100', Rule::unique('roles')->ignore($id)], 'description' => ['nullable', 'string', 'max:1000'], 'is_active' => ['sometimes', 'boolean'], 'permissions' => ['sometimes', 'array'], 'permissions.*.product_id' => ['required', 'integer', 'exists:products,id'], 'permissions.*.can_access' => ['sometimes', 'boolean'], 'permissions.*.can_buy' => ['sometimes', 'boolean']];
    }
}
