<?php

$publicPath = dirname(__DIR__, 2).'/public_html';
$requestPath = rawurldecode(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?: '/');

if ($requestPath === '/index.php' || $requestPath === '/up' || str_starts_with($requestPath, '/api/')) {
    require $publicPath.'/index.php';

    return true;
}

if (str_ends_with(strtolower($requestPath), '.php')) {
    http_response_code(404);

    return true;
}

$requestedFile = realpath($publicPath.'/'.$requestPath);
$publicRoot = realpath($publicPath);

if ($requestedFile !== false
    && $publicRoot !== false
    && str_starts_with($requestedFile, $publicRoot.DIRECTORY_SEPARATOR)
    && is_file($requestedFile)) {
    return false;
}

header('Content-Type: text/html; charset=UTF-8');
header('Cache-Control: no-cache, no-store, must-revalidate');
readfile($publicPath.'/index.html');

return true;
