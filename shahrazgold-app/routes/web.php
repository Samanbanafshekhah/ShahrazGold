<?php

use App\Http\Controllers\FrontendController;
use Illuminate\Support\Facades\Route;

Route::get('/{path?}', FrontendController::class)
    ->where('path', '^(?!api(?:/|$)|up(?:/|$)|storage(?:/|$)).*');
