<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserIsActive
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! $request->user()?->is_active || $request->user()?->trashed()) {
            $request->user()?->tokens()->delete();
            abort(403, 'User account is inactive.');
        }

        return $next($request);
    }
}
