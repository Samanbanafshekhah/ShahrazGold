<?php

namespace App\Http\Controllers;

use Symfony\Component\HttpFoundation\BinaryFileResponse;

class FrontendController extends Controller
{
    public function __invoke(): BinaryFileResponse
    {
        $index = public_path('index.html');

        abort_unless(is_file($index), 503, 'Frontend has not been built. Run npm run build.');

        return response()->file($index, [
            'Cache-Control' => 'no-cache, no-store, must-revalidate',
            'Content-Type' => 'text/html; charset=UTF-8',
        ]);
    }
}
