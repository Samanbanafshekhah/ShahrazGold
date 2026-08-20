<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PurchaseRequestResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id, 'request_number' => $this->request_number, 'client_reference' => $this->client_reference,
            'user' => $this->whenLoaded('user', fn () => ['id' => $this->user->id, 'name' => $this->user->first_name.' '.$this->user->last_name, 'mobile' => $this->user->mobile]),
            'product' => ['id' => $this->product_id, 'name' => $this->product_name, 'symbol' => $this->product_symbol, 'unit' => $this->product_unit],
            'product_price_id' => $this->product_price_id, 'trade_type' => $this->trade_type->value, 'entry_mode' => $this->entry_mode->value,
            'requested_quantity' => $this->requested_quantity, 'requested_amount_rial' => $this->requested_amount_rial,
            'calculated_quantity' => $this->calculated_quantity, 'raw_unit_price_rial' => $this->raw_unit_price_rial,
            'trade_adjustment_enabled' => $this->trade_adjustment_enabled, 'trade_adjustment_percent' => $this->trade_adjustment_percent,
            'adjustment_amount_per_unit_rial' => $this->adjustment_amount_per_unit_rial, 'final_unit_price_rial' => $this->final_unit_price_rial,
            'total_amount_rial' => $this->total_amount_rial, 'status' => $this->status->value, 'user_note' => $this->user_note, 'admin_note' => $this->admin_note,
            'price_effective_at' => $this->price_effective_at->utc()->toIso8601String(), 'created_at' => $this->created_at->utc()->toIso8601String(),
            'approved_at' => $this->approved_at?->utc()->toIso8601String(), 'rejected_at' => $this->rejected_at?->utc()->toIso8601String(), 'completed_at' => $this->completed_at?->utc()->toIso8601String(),
            'status_history' => $this->whenLoaded('histories', fn () => $this->histories->map(fn ($h) => ['from' => $h->from_status?->value, 'to' => $h->to_status->value, 'note' => $h->note, 'changed_by' => $h->changed_by, 'created_at' => $h->created_at->utc()->toIso8601String()])),
        ];
    }
}
