// <?php

// ini_set('display_errors', '1');
// error_reporting(E_ALL);

// $secret = 'ShahrazGold_Migrate_9Xv7_Q2m_L8p_2026';

// if (!isset($_GET['key']) || !hash_equals($secret, $_GET['key'])) {
//     http_response_code(403);
//     exit('Forbidden');
// }

// $basePath = '/home/h413472/shahrazgold-app';

// require $basePath . '/vendor/autoload.php';

// $app = require $basePath . '/bootstrap/app.php';

// $app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

// try {
//     $exitCode = Illuminate\Support\Facades\Artisan::call('migrate', [
//         '--force' => true,
//     ]);

//     echo '<pre>';
//     echo 'Exit Code: ' . $exitCode . "\n\n";
//     echo htmlspecialchars(Illuminate\Support\Facades\Artisan::output());
//     echo '</pre>';

// } catch (Throwable $e) {
//     echo '<pre>';
//     echo htmlspecialchars($e->getMessage());
//     echo "\n\n";
//     echo htmlspecialchars($e->getTraceAsString());
//     echo '</pre>';
// }