<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'kavenegar' => [
        'api_key' => env('KAVENEGAR_API_KEY'),
        'base_url' => env('KAVENEGAR_BASE_URL', 'https://api.kavenegar.com/v1'),
        'sender' => env('KAVENEGAR_SENDER'),
        'otp_template' => env('KAVENEGAR_OTP_TEMPLATE'),
        'timeout' => (int) env('KAVENEGAR_TIMEOUT', 10),
        'otp_ttl' => (int) env('KAVENEGAR_OTP_TTL', 300),
        'otp_resend_after' => (int) env('KAVENEGAR_OTP_RESEND_AFTER', 90),
        'otp_max_attempts' => (int) env('KAVENEGAR_OTP_MAX_ATTEMPTS', 5),
    ],

];
