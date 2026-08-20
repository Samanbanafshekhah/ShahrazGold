<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\PasswordRequest;
use App\Http\Requests\Auth\ProfileRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    public function register(RegisterRequest $request): JsonResponse
    {
        $user = User::create(array_merge($request->safe()->except(['password_confirmation']), ['role' => UserRole::Customer, 'is_active' => true]));
        $token = $user->createToken($request->input('device_name', 'api'))->plainTextToken;

        return $this->success(['user' => (new UserResource($user))->resolve(), 'access_token' => $token, 'token_type' => 'Bearer'], 'Registered.', 201);
    }

    public function login(LoginRequest $request, AuditService $audit): JsonResponse
    {
        $user = User::query()->where('mobile', $request->mobile)->first();
        if (! $user || ! $user->is_active || $user->trashed() || ! Hash::check($request->password, $user->password)) {
            return response()->json(['success' => false, 'message' => 'Invalid credentials.', 'data' => null, 'errors' => null], 401);
        }
        $user->forceFill(['last_login_at' => now()->utc()])->save();
        if ($user->isAdmin()) {
            $audit->record('admin.login', $user, null, ['last_login_at' => $user->last_login_at], $user->id);
        }
        $token = $user->createToken($request->input('device_name', 'api'))->plainTextToken;

        return $this->success(['user' => (new UserResource($user))->resolve(), 'access_token' => $token, 'token_type' => 'Bearer'], 'Logged in.');
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()?->delete();

        return $this->success(null, 'Logged out.');
    }

    public function logoutAll(Request $request): JsonResponse
    {
        $request->user()->tokens()->delete();

        return $this->success(null, 'All sessions logged out.');
    }

    public function me(Request $request): JsonResponse
    {
        return $this->success((new UserResource($request->user()))->resolve());
    }

    public function profile(ProfileRequest $request): JsonResponse
    {
        $request->user()->update($request->validated());

        return $this->success((new UserResource($request->user()->refresh()))->resolve(), 'Profile updated.');
    }

    public function password(PasswordRequest $request): JsonResponse
    {
        $request->user()->update(['password' => $request->password]);
        $request->user()->tokens()->where('id', '!=', $request->user()->currentAccessToken()?->id)->delete();

        return $this->success(null, 'Password updated.');
    }
}
