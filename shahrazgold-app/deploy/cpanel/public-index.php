<?php

use Illuminate\Http\Request;

define('LARAVEL_START', microtime(true));

$appRoot = dirname(__DIR__).'/shahrazgold-app';

if (! is_file($appRoot.'/vendor/autoload.php')) {
    http_response_code(503);
    header('Content-Type: application/json; charset=UTF-8');
    echo json_encode(['success' => false, 'message' => 'Application is not installed correctly.']);
    exit;
}

if (file_exists($maintenance = $appRoot.'/storage/framework/maintenance.php')) {
    require $maintenance;
}

require $appRoot.'/vendor/autoload.php';

$app = require_once $appRoot.'/bootstrap/app.php';
$app->usePublicPath(__DIR__);
$app->handleRequest(Request::capture());
