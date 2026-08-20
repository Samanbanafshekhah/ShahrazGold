<?php

namespace App\Console\Commands;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;

class CreateAdmin extends Command
{
    protected $signature = 'app:create-admin';

    protected $description = 'Interactively create the first ShahrazGold administrator';

    public function handle(): int
    {
        $data = ['first_name' => $this->ask('First name'), 'last_name' => $this->ask('Last name'), 'mobile' => $this->ask('Iranian mobile (09xxxxxxxxx)'), 'email' => $this->ask('Email (optional)') ?: null, 'password' => $this->secret('Password'), 'password_confirmation' => $this->secret('Confirm password')];
        $validator = validator($data, ['first_name' => ['required', 'string', 'max:100'], 'last_name' => ['required', 'string', 'max:100'], 'mobile' => ['required', 'regex:/^09\d{9}$/', 'unique:users,mobile'], 'email' => ['nullable', 'email:rfc', 'unique:users,email'], 'password' => ['required', 'confirmed', Password::min(8)]]);
        if ($validator->fails()) {
            foreach ($validator->errors()->all() as $error) {
                $this->error($error);
            }

            return self::FAILURE;
        }
        User::create(['first_name' => $data['first_name'], 'last_name' => $data['last_name'], 'mobile' => $data['mobile'], 'email' => $data['email'], 'password' => Hash::make($data['password']), 'role' => UserRole::Admin, 'is_active' => true]);
        $this->info('Administrator created successfully.');

        return self::SUCCESS;
    }
}
