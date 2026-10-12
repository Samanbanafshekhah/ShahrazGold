<?php

namespace App\Services;

use App\Exceptions\HomeGoldException;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

class HomeGoldService
{
    /**
     * Prices and names are returned without conversion; the ID is normalized to CommodityId.
     *
     * @return list<array{name: string, sellPrice: int|float|string, buyPrice: int|float|string, CommodityId: string}>
     */
    public function commodities(): array
    {
        try {
            $response = $this->http()->withToken($this->token())
                ->get('/PartnerAPI/Ordering/ExternalPartner/commodity');

            // The document has no refresh endpoint. Authenticate again once on expiry.
            if ($response->status() === 401) {
                $this->forgetToken();
                $response = $this->http()->withToken($this->token())
                    ->get('/PartnerAPI/Ordering/ExternalPartner/commodity');
            }
        } catch (ConnectionException) {
            throw new HomeGoldException('Could not connect to HomeGold.');
        }

        if (! $response->successful()) {
            throw new HomeGoldException('HomeGold commodity request failed (HTTP '.$response->status().').');
        }

        $payload = $response->json();
        if (is_array($payload) && array_key_exists('success', $payload) && $payload['success'] !== true) {
            throw new HomeGoldException('HomeGold commodity request was rejected.');
        }
        // Live v4 returns an envelope and camelCase IDs; the PDF shows a plain list.
        $products = is_array($payload) && array_key_exists('data', $payload) ? $payload['data'] : $payload;
        if (! is_array($products) || ! array_is_list($products)) {
            throw new HomeGoldException('HomeGold returned an invalid commodity list.');
        }

        $normalized = [];
        foreach ($products as $product) {
            if (is_array($product)) {
                $product['CommodityId'] = $product['CommodityId'] ?? $product['commodityId'] ?? null;
            }
            if (! is_array($product)
                || ! is_string($product['name'] ?? null)
                || ! is_string($product['CommodityId'] ?? null)
                || trim($product['CommodityId']) === ''
                || ! is_numeric($product['buyPrice'] ?? null)
                || ! is_numeric($product['sellPrice'] ?? null)) {
                throw new HomeGoldException('HomeGold returned an invalid commodity entry.');
            }
            $normalized[] = [
                'name' => $product['name'],
                'sellPrice' => $product['sellPrice'],
                'buyPrice' => $product['buyPrice'],
                'CommodityId' => $product['CommodityId'],
            ];
        }

        return $normalized;
    }

    public function forgetToken(): void
    {
        Cache::store(config('services.homegold.cache_store', 'file'))->forget($this->cacheKey());
    }

    private function token(): string
    {
        $clientId = trim((string) config('services.homegold.client_id'));
        $clientSecret = trim((string) config('services.homegold.client_secret'));
        if ($clientId === '' || $clientSecret === '') {
            throw new HomeGoldException('Set HOMEGOLD_CLIENT_ID and HOMEGOLD_CLIENT_SECRET in .env.');
        }

        return Cache::store(config('services.homegold.cache_store', 'file'))->remember($this->cacheKey(), max(1, (int) config('services.homegold.token_ttl', 300)), function () use ($clientId, $clientSecret): string {
            try {
                $response = $this->http()->post('/ExternalPartnerAuth/token', [
                    'Client_Id' => $clientId,
                    'Client_Secret' => $clientSecret,
                ]);
            } catch (ConnectionException) {
                throw new HomeGoldException('Could not connect to HomeGold authentication.');
            }

            $payload = $response->json();
            $token = data_get($payload, 'data.key');
            if (! $response->successful() || data_get($payload, 'success') !== true
                || ! is_string($token) || trim($token) === '') {
                throw new HomeGoldException('HomeGold authentication failed (HTTP '.$response->status().').');
            }

            return $token;
        });
    }

    private function http(): PendingRequest
    {
        $baseUrl = rtrim((string) config('services.homegold.base_url'), '/');
        if (parse_url($baseUrl, PHP_URL_SCHEME) !== 'https') {
            throw new HomeGoldException('HOMEGOLD_BASE_URL must use HTTPS.');
        }

        return Http::baseUrl($baseUrl)->acceptJson()->asJson()
            ->withoutRedirecting()->connectTimeout(5)
            ->timeout(max(1, (int) config('services.homegold.timeout', 15)));
    }

    private function cacheKey(): string
    {
        return 'homegold:token:'.hash('sha256', json_encode([
            config('services.homegold.base_url'),
            config('services.homegold.client_id'),
            config('services.homegold.client_secret'),
        ], JSON_THROW_ON_ERROR));
    }
}
