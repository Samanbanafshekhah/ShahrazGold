#!/usr/bin/env php
<?php

declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit('CLI only.');
}

define('LARAVEL_START', microtime(true));

$logPath = __DIR__.'/storage/logs/cpanel-role-limits-update.log';
$status = 1;
$output = null;
$error = '';

try {
    require __DIR__.'/vendor/autoload.php';
    $output = new Symfony\Component\Console\Output\BufferedOutput;
    $app = require __DIR__.'/bootstrap/app.php';
    $kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
    $kernel->bootstrap();

    foreach (['config:clear', 'route:clear', 'view:clear'] as $command) {
        if ($kernel->call($command, [], $output) !== 0) {
            throw new RuntimeException('Failed command: '.$command);
        }
    }

    $status = $kernel->call('migrate', [
        '--force' => true,
        '--path' => [
            'database/migrations/2026_10_01_000001_add_transaction_limit_rial_to_users_table.php',
            'database/migrations/2026_10_05_000001_add_quantity_purchase_limits_to_users.php',
        ],
    ], $output);
} catch (Throwable $exception) {
    $status = 1;
    $error = $exception->getMessage();
}

$entry = sprintf("[%s] exit=%d\n%s\n", date('c'), $status, trim(($output?->fetch() ?? '')."\n".$error));
file_put_contents($logPath, $entry, FILE_APPEND | LOCK_EX);
echo $entry;
exit($status);
