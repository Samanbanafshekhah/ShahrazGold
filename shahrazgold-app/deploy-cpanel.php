#!/usr/bin/env php
<?php

declare(strict_types=1);

use Illuminate\Contracts\Console\Kernel as ConsoleKernel;
use Symfony\Component\Console\Input\ArrayInput;
use Symfony\Component\Console\Output\BufferedOutput;

define('LARAVEL_START', microtime(true));

$logPath = __DIR__.'/storage/logs/cpanel-deploy.log';
$startedAt = date('c');

try {
    require __DIR__.'/vendor/autoload.php';

    $app = require_once __DIR__.'/bootstrap/app.php';
    $kernel = $app->make(ConsoleKernel::class);
    $input = new ArrayInput([
        'command' => 'app:deploy-cpanel',
        '--force' => true,
    ]);
    $output = new BufferedOutput;

    $status = $kernel->handle($input, $output);
    $kernel->terminate($input, $status);
    $result = $output->fetch();
} catch (Throwable $exception) {
    $status = 1;
    $result = sprintf(
        "Unhandled deployment error: %s in %s:%d\n",
        $exception->getMessage(),
        $exception->getFile(),
        $exception->getLine(),
    );
}

$entry = sprintf(
    "[%s] exit=%d\n%s\n",
    $startedAt,
    $status,
    rtrim($result),
);

file_put_contents($logPath, $entry, FILE_APPEND | LOCK_EX);
echo $entry;

exit($status);
