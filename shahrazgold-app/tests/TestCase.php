<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    protected function setUp(): void
    {
        foreach ([
            'APP_ENV' => 'testing',
            'DB_CONNECTION' => 'pgsql',
            'DB_HOST' => getenv('DB_HOST') ?: 'postgres',
            'DB_PORT' => getenv('DB_PORT') ?: '5432',
            'DB_DATABASE' => 'shahrazgold_test',
            'DB_URL' => '',
            'CACHE_STORE' => 'array',
            'SESSION_DRIVER' => 'array',
            'QUEUE_CONNECTION' => 'sync',
        ] as $key => $value) {
            putenv("{$key}={$value}");
            $_ENV[$key] = $value;
            $_SERVER[$key] = $value;
        }

        parent::setUp();
    }
}
