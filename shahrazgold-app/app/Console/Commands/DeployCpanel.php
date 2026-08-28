<?php

namespace App\Console\Commands;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rules\Password;
use JsonException;
use Throwable;

class DeployCpanel extends Command
{
    protected $signature = 'app:deploy-cpanel {--force : Allow the command to run in production} {--skip-optimize : Do not build Laravel production caches}';

    protected $description = 'Run the one-time, non-interactive cPanel deployment';

    public function handle(): int
    {
        if (app()->environment('production') && ! $this->option('force')) {
            $this->error('Production deployment requires --force.');

            return self::FAILURE;
        }

        if (! $this->validateConfiguration()) {
            return self::FAILURE;
        }

        $lockPath = storage_path('framework/cache/cpanel-deploy.lock');
        $lock = fopen($lockPath, 'c+');

        if ($lock === false || ! flock($lock, LOCK_EX | LOCK_NB)) {
            $this->error('Another cPanel deployment process is already running.');

            return self::FAILURE;
        }

        try {
            if ($this->call('package:discover', ['--ansi' => true]) !== self::SUCCESS) {
                return self::FAILURE;
            }

            if ($this->call('migrate', ['--force' => true]) !== self::SUCCESS) {
                return self::FAILURE;
            }

            if (! $this->createInitialAdmin()) {
                return self::FAILURE;
            }

            if (! $this->preparePublicStorage()) {
                return self::FAILURE;
            }

            if (! $this->option('skip-optimize') && $this->call('optimize') !== self::SUCCESS) {
                return self::FAILURE;
            }

            $this->newLine();
            $this->info('cPanel deployment completed successfully. Delete this one-time cron job now.');

            return self::SUCCESS;
        } catch (Throwable $exception) {
            report($exception);
            $this->error($exception->getMessage());

            return self::FAILURE;
        } finally {
            flock($lock, LOCK_UN);
            fclose($lock);
        }
    }

    private function validateConfiguration(): bool
    {
        $ok = true;
        $key = (string) config('app.key');
        $publicStorage = (string) config('filesystems.disks.public.root');

        if ($key === '' || str_contains($key, '__APP_KEY__')) {
            $this->error('APP_KEY is missing. Build a fresh cPanel package or set a unique Laravel application key.');
            $ok = false;
        }

        if (config('app.debug')) {
            $this->error('APP_DEBUG must be false in production.');
            $ok = false;
        }

        if (! in_array(config('database.default'), ['mysql', 'pgsql'], true)) {
            $this->error('DB_CONNECTION must be mysql or pgsql.');
            $ok = false;
        }

        if ($publicStorage === '' || str_contains($publicStorage, 'CPANEL_USERNAME')) {
            $this->error('PUBLIC_STORAGE_PATH must contain the real absolute cPanel path.');
            $ok = false;
        }

        return $ok;
    }

    private function createInitialAdmin(): bool
    {
        $path = storage_path('app/deployment-admin.json');

        if (! is_file($path)) {
            if (User::query()->where('role', UserRole::Admin)->exists()) {
                $this->line('An administrator already exists; no deployment-admin.json file was consumed.');

                return true;
            }

            $this->error('Copy storage/app/deployment-admin.json.example to deployment-admin.json and fill it in.');

            return false;
        }

        try {
            $data = json_decode((string) file_get_contents($path), true, 512, JSON_THROW_ON_ERROR);
        } catch (JsonException $exception) {
            $this->error('deployment-admin.json is not valid JSON: '.$exception->getMessage());

            return false;
        }

        $validator = Validator::make($data, [
            'first_name' => ['required', 'string', 'max:100'],
            'last_name' => ['required', 'string', 'max:100'],
            'mobile' => ['required', 'regex:/^09\d{9}$/', 'unique:users,mobile'],
            'email' => ['nullable', 'email:rfc', 'unique:users,email'],
            'password' => ['required', 'string', Password::min(12)],
        ]);

        if ($validator->fails()) {
            foreach ($validator->errors()->all() as $error) {
                $this->error($error);
            }

            return false;
        }

        $validated = $validator->validated();
        User::create([
            'first_name' => $validated['first_name'],
            'last_name' => $validated['last_name'],
            'mobile' => $validated['mobile'],
            'email' => $validated['email'] ?? null,
            'password' => Hash::make($validated['password']),
            'role' => UserRole::Admin,
            'is_active' => true,
            'mobile_verified_at' => now(),
        ]);

        if (! unlink($path)) {
            $this->error('The administrator was created, but deployment-admin.json could not be deleted. Delete it manually immediately.');

            return false;
        }

        $this->info('The initial administrator was created and the plaintext credential file was deleted.');

        return true;
    }

    private function preparePublicStorage(): bool
    {
        $path = (string) config('filesystems.disks.public.root');

        if (! is_dir($path) && ! mkdir($path, 0755, true) && ! is_dir($path)) {
            $this->error('Could not create the public storage directory: '.$path);

            return false;
        }

        $protection = <<<'HTACCESS'
Options -Indexes
<FilesMatch "\.(?:php[0-9]?|phtml|phar)$">
    Require all denied
</FilesMatch>
HTACCESS;

        if (file_put_contents($path.'/.htaccess', $protection."\n", LOCK_EX) === false) {
            $this->error('Could not protect the public storage directory with .htaccess.');

            return false;
        }

        $this->info('Public image storage is ready.');

        return true;
    }
}
