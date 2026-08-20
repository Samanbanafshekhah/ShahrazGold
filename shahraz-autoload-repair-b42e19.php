<?php

declare(strict_types=1);

use Illuminate\Contracts\Console\Kernel as ConsoleKernel;
use Symfony\Component\Console\Input\ArrayInput;
use Symfony\Component\Console\Output\BufferedOutput;

header('Content-Type: text/plain; charset=UTF-8');
header('Cache-Control: no-store');

$appRoot = dirname(__DIR__).'/shahrazgold-app';
$autoload = $appRoot.'/vendor/autoload.php';
$autoloadReal = $appRoot.'/vendor/composer/autoload_real.php';
$controller = $appRoot.'/app/Http/Controllers/Api/V1/ManagerStatusController.php';
$backup = $autoloadReal.'.before-shahraz-fix';

try {
    foreach ([$autoload, $autoloadReal, $controller] as $requiredFile) {
        if (! is_file($requiredFile)) {
            throw new RuntimeException('Missing file: '.$requiredFile);
        }
    }

    $contents = file_get_contents($autoloadReal);
    if ($contents === false) {
        throw new RuntimeException('Cannot read Composer autoload_real.php.');
    }

    if (str_contains($contents, 'setClassMapAuthoritative(true)')) {
        if (! is_file($backup) && ! copy($autoloadReal, $backup)) {
            throw new RuntimeException('Cannot create the autoload backup.');
        }

        $updated = str_replace(
            'setClassMapAuthoritative(true)',
            'setClassMapAuthoritative(false)',
            $contents,
            $replacements,
        );

        if ($replacements < 1 || file_put_contents($autoloadReal, $updated, LOCK_EX) === false) {
            throw new RuntimeException('Cannot update Composer autoload_real.php.');
        }

        echo 'autoload_mode=changed_to_psr4'.PHP_EOL;
    } elseif (str_contains($contents, 'setClassMapAuthoritative(false)')) {
        echo 'autoload_mode=already_psr4'.PHP_EOL;
    } else {
        throw new RuntimeException('Composer authoritative marker was not found.');
    }

    if (function_exists('opcache_invalidate')) {
        opcache_invalidate($autoloadReal, true);
    }
    if (function_exists('opcache_reset')) {
        opcache_reset();
    }

    require $autoload;

    $classExists = class_exists(App\Http\Controllers\Api\V1\ManagerStatusController::class);
    echo 'controller_class='.($classExists ? 'yes' : 'no').PHP_EOL;

    if (! $classExists) {
        throw new RuntimeException('Controller is still not autoloadable. Check its namespace and filename case.');
    }

    $app = require $appRoot.'/bootstrap/app.php';
    $kernel = $app->make(ConsoleKernel::class);

    foreach ([
        ['command' => 'migrate', '--force' => true],
        ['command' => 'optimize:clear'],
    ] as $arguments) {
        $input = new ArrayInput($arguments);
        $output = new BufferedOutput;
        $status = $kernel->handle($input, $output);
        $kernel->terminate($input, $status);

        echo $arguments['command'].'_exit='.$status.PHP_EOL;
        echo trim($output->fetch()).PHP_EOL;
    }
} catch (Throwable $exception) {
    http_response_code(500);
    echo 'error='.$exception->getMessage().PHP_EOL;
} finally {
    echo 'self_deleted='.(@unlink(__FILE__) ? 'yes' : 'no').PHP_EOL;
}
