<?php

namespace Tests\Unit;

use App\Exceptions\HomeGoldException;
use App\Services\HomeGoldService;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class HomeGoldServiceTest extends TestCase
{
    private array $products = [
        ['name' => 'نقد فردا', 'sellPrice' => 48760000, 'buyPrice' => 48870000, 'CommodityId' => 'commodity-1'],
    ];

    protected function setUp(): void
    {
        parent::setUp();
        config(['services.homegold' => [
            'base_url' => 'https://homegold.example',
            'client_id' => 'test-client',
            'client_secret' => 'test-secret',
            'cache_store' => 'array',
            'token_ttl' => 300,
            'timeout' => 15,
        ]]);
        Http::preventStrayRequests();
    }

    public function test_authenticates_with_documented_fields_and_caches_only_the_token(): void
    {
        Http::fake([
            '*/ExternalPartnerAuth/token' => Http::response(['success' => true, 'data' => ['key' => 'token-1']]),
            '*/PartnerAPI/Ordering/ExternalPartner/commodity' => Http::response($this->products),
        ]);
        $service = app(HomeGoldService::class);
        $this->assertSame($this->products, $service->commodities());
        $this->assertSame($this->products, $service->commodities());
        Http::assertSentCount(3);
        Http::assertSent(fn (Request $request) => $request->method() === 'POST'
            && $request->data() === ['Client_Id' => 'test-client', 'Client_Secret' => 'test-secret']);
        Http::assertSent(fn (Request $request) => $request->method() === 'GET'
            && $request->hasHeader('Authorization', 'Bearer token-1'));
    }

    public function test_expired_token_is_replaced_and_request_retried_once(): void
    {
        Http::fake([
            '*/ExternalPartnerAuth/token' => Http::sequence()
                ->push(['success' => true, 'data' => ['key' => 'old-token']])
                ->push(['success' => true, 'data' => ['key' => 'new-token']]),
            '*/PartnerAPI/Ordering/ExternalPartner/commodity' => Http::sequence()
                ->push([], 401)->push($this->products),
        ]);
        $this->assertSame($this->products, app(HomeGoldService::class)->commodities());
        Http::assertSentCount(4);
        Http::assertSent(fn (Request $request) => $request->hasHeader('Authorization', 'Bearer new-token'));
    }

    public function test_repeated_unauthorized_response_does_not_loop(): void
    {
        Http::fake([
            '*/ExternalPartnerAuth/token' => Http::response(['success' => true, 'data' => ['key' => 'token']]),
            '*/PartnerAPI/Ordering/ExternalPartner/commodity' => Http::response([], 401),
        ]);
        try {
            app(HomeGoldService::class)->commodities();
            $this->fail('Expected authentication failure.');
        } catch (HomeGoldException $exception) {
            $this->assertStringContainsString('HTTP 401', $exception->getMessage());
            Http::assertSentCount(4);
        }
    }

    public function test_missing_credentials_fail_before_sending_a_request(): void
    {
        config(['services.homegold.client_secret' => '']);
        $this->expectException(HomeGoldException::class);
        $this->expectExceptionMessage('HOMEGOLD_CLIENT_SECRET');
        app(HomeGoldService::class)->commodities();
    }

    public function test_authentication_failure_does_not_leak_response_secrets(): void
    {
        Http::fake(['*' => Http::response(['success' => false, 'message' => 'test-secret'], 403)]);
        $this->expectException(HomeGoldException::class);
        $this->expectExceptionMessage('HomeGold authentication failed (HTTP 403).');
        app(HomeGoldService::class)->commodities();
    }

    public function test_invalid_commodity_response_is_rejected(): void
    {
        Http::fake([
            '*/ExternalPartnerAuth/token' => Http::response(['success' => true, 'data' => ['key' => 'token']]),
            '*/PartnerAPI/Ordering/ExternalPartner/commodity' => Http::response([['name' => 'bad']]),
        ]);
        $this->expectException(HomeGoldException::class);
        $this->expectExceptionMessage('invalid commodity entry');
        app(HomeGoldService::class)->commodities();
    }

    public function test_connection_failure_is_reported(): void
    {
        Http::fake(['*' => Http::failedConnection()]);
        $this->expectException(HomeGoldException::class);
        $this->expectExceptionMessage('Could not connect to HomeGold authentication.');
        app(HomeGoldService::class)->commodities();
    }

    public function test_command_prints_json_without_tokens(): void
    {
        Http::fake([
            '*/ExternalPartnerAuth/token' => Http::response(['success' => true, 'data' => ['key' => 'token']]),
            '*/PartnerAPI/Ordering/ExternalPartner/commodity' => Http::response($this->products),
        ]);
        $this->artisan('homegold:commodities --json')->expectsOutput(json_encode(
            $this->products, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT,
        ))->assertSuccessful();
    }

    public function test_live_envelope_and_camel_case_id_are_supported(): void
    {
        $product = $this->products[0];
        $product['commodityId'] = $product['CommodityId'];
        unset($product['CommodityId']);
        Http::fake([
            '*/ExternalPartnerAuth/token' => Http::response(['success' => true, 'data' => ['key' => 'token']]),
            '*/PartnerAPI/Ordering/ExternalPartner/commodity' => Http::response(['success' => true, 'data' => [$product]]),
        ]);
        $this->assertSame($this->products, app(HomeGoldService::class)->commodities());
    }

    public function test_failed_envelope_is_rejected_even_with_http_200(): void
    {
        Http::fake([
            '*/ExternalPartnerAuth/token' => Http::response(['success' => true, 'data' => ['key' => 'token']]),
            '*/PartnerAPI/Ordering/ExternalPartner/commodity' => Http::response(['success' => false, 'data' => []]),
        ]);
        $this->expectException(HomeGoldException::class);
        $this->expectExceptionMessage('commodity request was rejected');
        app(HomeGoldService::class)->commodities();
    }

    public function test_empty_product_list_is_valid(): void
    {
        Http::fake([
            '*/ExternalPartnerAuth/token' => Http::response(['success' => true, 'data' => ['key' => 'token']]),
            '*/PartnerAPI/Ordering/ExternalPartner/commodity' => Http::response(['success' => true, 'data' => []]),
        ]);
        $this->assertSame([], app(HomeGoldService::class)->commodities());
    }

    public function test_command_returns_failure_on_provider_error(): void
    {
        Http::fake(['*' => Http::response([], 500)]);
        $this->artisan('homegold:commodities')->assertFailed();
    }
}
