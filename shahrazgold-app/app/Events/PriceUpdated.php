<?php

namespace App\Events;

use App\Models\ProductPrice;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Contracts\Events\ShouldDispatchAfterCommit;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class PriceUpdated implements ShouldBroadcastNow, ShouldDispatchAfterCommit
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    private readonly string $broadcastedAt;

    public function __construct(
        public ProductPrice $productPrice,
        public ?int $onlyRoleId = null,
        public ?string $roleBuyPriceRial = null,
        public ?string $roleSellPriceRial = null,
    ) {
        $this->broadcastedAt = now()->utc()->toISOString();
    }

    /** @return array<int, PrivateChannel> */
    public function broadcastOn(): array
    {
        if ($this->onlyRoleId !== null) {
            return [new PrivateChannel("prices.role.{$this->onlyRoleId}")];
        }

        $roleChannels = $this->productPrice->product->roles()
            ->where('roles.is_active', true)
            ->where('roles.slug', '!=', 'admin')
            ->wherePivot('can_access', true)
            ->pluck('roles.id')
            ->map(fn (int $roleId) => new PrivateChannel("prices.role.{$roleId}"))
            ->all();

        return [new PrivateChannel('prices.admin'), ...$roleChannels];
    }

    public function broadcastAs(): string
    {
        return 'price.updated';
    }

    /** @return array<string, int|string|null> */
    public function broadcastWith(): array
    {
        $product = $this->productPrice->product;
        $payload = [
            'product_id' => $product->id,
            'price_id' => $this->productPrice->id,
            'price_version' => (int) $product->price_version,
            'price_adjustment_version' => $this->onlyRoleId === null
                ? null
                : (int) $product->roles()->whereKey($this->onlyRoleId)->value('role_product_permissions.price_version'),
            'raw_price_rial' => (string) $this->productPrice->raw_price_rial,
            'sell_price_difference_rial' => (string) $product->sell_price_difference_rial,
            'buy_price_rial' => $this->roleBuyPriceRial,
            'sell_price_rial' => $this->roleSellPriceRial,
            'effective_at' => $this->productPrice->effective_at->utc()->toISOString(),
            'updated_at' => $this->broadcastedAt,
        ];

        Log::channel('realtime')->info('price.broadcasting', [
            'product_id' => $product->id,
            'price_id' => $this->productPrice->id,
            'target_role_id' => $this->onlyRoleId,
            'timestamp' => $this->broadcastedAt,
        ]);

        return $payload;
    }
}
