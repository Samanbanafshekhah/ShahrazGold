<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class EnvironmentIsolationTest extends TestCase
{
    public function test_suite_is_connected_to_dedicated_test_database(): void
    {
        $database = DB::selectOne('select current_database() as name')->name;

        $this->assertSame('testing', app()->environment());
        $this->assertSame('shahrazgold_test', $database);
        $this->assertSame('array', config('cache.default'));
    }
}
