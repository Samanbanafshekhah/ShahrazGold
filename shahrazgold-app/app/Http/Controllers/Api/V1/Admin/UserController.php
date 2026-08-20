<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UserRequest;
use App\Http\Requests\Admin\UserStatusRequest;
use App\Http\Resources\UserResource;
use App\Models\Role;
use App\Models\User;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class UserController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $q = User::query();
        $q->when($request->filled('search'), fn ($x) => $x->where(function ($s) use ($request) {
            $term = '%'.$request->search.'%';
            $s->whereLike('first_name', $term)->orWhereLike('last_name', $term)->orWhereLike('mobile', $term)->orWhereLike('email', $term);
        }));
        $q->when($request->filled('role'), fn ($x) => $x->where('role', $request->role))->when($request->has('is_active'), fn ($x) => $x->where('is_active', $request->boolean('is_active')));
        $q->orderBy('created_at', $request->input('sort') === 'oldest' ? 'asc' : 'desc');

        return $this->paginated($q->paginate(min($request->integer('per_page', 15), 100)), fn ($u) => (new UserResource($u))->resolve());
    }

    public function store(UserRequest $request, AuditService $audit): JsonResponse
    {
        $data = $this->normalizeRole($request->safe()->except(['password_confirmation']));
        $user = User::create($data);
        $audit->record('user.created', $user, null, $user->toArray());

        return $this->success((new UserResource($user->load('accessRole')))->resolve(), 'User created.', 201);
    }

    public function show(User $user): JsonResponse
    {
        return $this->success((new UserResource($user))->resolve());
    }

    public function update(UserRequest $request, User $user, AuditService $audit): JsonResponse
    {
        return DB::transaction(function () use ($request, $user, $audit) {
            $activeAdmins = $this->lockActiveAdmins();
            $locked = User::query()->lockForUpdate()->findOrFail($user->id);
            $old = $locked->toArray();
            $data = $this->normalizeRole($request->safe()->except(['password_confirmation']));
            if (empty($data['password'])) {
                unset($data['password']);
            }
            $demoting = $locked->role === UserRole::Admin && ($data['role'] ?? null) !== UserRole::Admin->value;
            $deactivating = $locked->is_active && array_key_exists('is_active', $data) && ! $data['is_active'];
            if (($demoting || $deactivating) && $activeAdmins->count() <= 1) {
                abort(409, 'The last active administrator cannot be changed.');
            }
            if ($locked->id === $request->user()->id && $deactivating) {
                abort(409, 'You cannot deactivate yourself.');
            }
            $roleChanged = isset($data['role']) && $data['role'] !== $locked->role->value;
            $locked->update($data);
            if ($roleChanged || $deactivating) {
                $locked->tokens()->delete();
            } $audit->record('user.updated', $locked, $old, $locked->fresh()->toArray());

            return $this->success((new UserResource($locked->fresh()->load('accessRole')))->resolve(), 'User updated.');
        }, 3);
    }

    public function status(UserStatusRequest $request, User $user, AuditService $audit): JsonResponse
    {
        return DB::transaction(function () use ($request, $user, $audit) {
            $activeAdmins = $this->lockActiveAdmins();
            $locked = User::query()->lockForUpdate()->findOrFail($user->id);
            if ($locked->id === $request->user()->id && ! $request->boolean('is_active')) {
                abort(409, 'You cannot deactivate yourself.');
            }
            if ($locked->role === UserRole::Admin && $locked->is_active && ! $request->boolean('is_active') && $activeAdmins->count() <= 1) {
                abort(409, 'The last active administrator cannot be deactivated.');
            }
            $old = $locked->toArray();
            $locked->update(['is_active' => $request->boolean('is_active')]);
            if (! $locked->is_active) {
                $locked->tokens()->delete();
            }$audit->record('user.status_changed', $locked, $old, $locked->fresh()->toArray());

            return $this->success((new UserResource($locked->fresh()))->resolve(), 'Status updated.');
        }, 3);
    }

    public function destroy(Request $request, User $user, AuditService $audit): JsonResponse
    {
        return DB::transaction(function () use ($request, $user, $audit) {
            $activeAdmins = $this->lockActiveAdmins();
            $locked = User::query()->lockForUpdate()->findOrFail($user->id);
            abort_if($locked->id === $request->user()->id, 409, 'You cannot delete yourself.');
            if ($locked->role === UserRole::Admin && $locked->is_active && $activeAdmins->count() <= 1) {
                abort(409, 'The last active administrator cannot be deleted.');
            }
            $locked->tokens()->delete();
            $audit->record('user.deleted', $locked, $locked->toArray(), null);
            $locked->delete();

            return $this->success(null, 'User deleted.');
        }, 3);
    }

    private function normalizeRole(array $data): array
    {
        if (! empty($data['role_id'])) {
            $role = Role::findOrFail($data['role_id']);
            $data['role'] = $role->slug === 'admin' ? UserRole::Admin->value : UserRole::Customer->value;
        } elseif (! empty($data['role'])) {
            $data['role_id'] = Role::where('slug', $data['role'])->value('id');
        }

        return $data;
    }

    private function lockActiveAdmins()
    {
        return User::query()->where('role', UserRole::Admin)->where('is_active', true)->orderBy('id')->lockForUpdate()->get();
    }
}
