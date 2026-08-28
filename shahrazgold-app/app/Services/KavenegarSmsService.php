<?php

namespace App\Services;

use App\Exceptions\KavenegarException;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;

class KavenegarSmsService
{
    /** @return array<string, mixed> */
    public function sendOtp(string $receptor, string $token): array
    {
        $template = trim((string) config('services.kavenegar.otp_template'));
        if ($template === '') {
            throw new KavenegarException('Kavenegar OTP template is not configured.');
        }

        return $this->request('verify/lookup.json', [
            'receptor' => $receptor,
            'token' => $token,
            'template' => $template,
            'type' => 'sms',
        ]);
    }

    /** @return array<string, mixed> */
    public function send(string $receptor, string $message): array
    {
        $parameters = ['receptor' => $receptor, 'message' => $message];
        $sender = trim((string) config('services.kavenegar.sender'));
        if ($sender !== '') {
            $parameters['sender'] = $sender;
        }

        return $this->request('sms/send.json', $parameters);
    }

    /**
     * @param  array<string, string>  $parameters
     * @return array<string, mixed>
     */
    private function request(string $method, array $parameters): array
    {
        $apiKey = trim((string) config('services.kavenegar.api_key'));
        if ($apiKey === '') {
            throw new KavenegarException('Kavenegar API key is not configured.');
        }

        $baseUrl = rtrim((string) config('services.kavenegar.base_url'), '/');
        $url = $baseUrl.'/'.rawurlencode($apiKey).'/'.$method;

        try {
            $response = Http::asForm()
                ->acceptJson()
                ->connectTimeout(5)
                ->timeout((int) config('services.kavenegar.timeout', 10))
                ->post($url, $parameters);
        } catch (ConnectionException $exception) {
            throw new KavenegarException('Could not connect to Kavenegar.', previous: $exception);
        }

        return $this->validatedEntry($response);
    }

    /** @return array<string, mixed> */
    private function validatedEntry(Response $response): array
    {
        $payload = $response->json();
        $status = is_array($payload) ? data_get($payload, 'return.status') : null;
        $message = is_array($payload) ? data_get($payload, 'return.message') : null;

        if (! $response->successful() || (int) $status !== 200) {
            throw new KavenegarException(
                is_string($message) && $message !== '' ? $message : 'Invalid response from Kavenegar.',
                is_numeric($status) ? (int) $status : $response->status(),
            );
        }

        $entry = data_get($payload, 'entries.0');
        if (! is_array($entry)) {
            throw new KavenegarException('Kavenegar response did not contain a message entry.', 200);
        }

        return $entry;
    }
}
