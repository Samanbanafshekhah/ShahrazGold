<?php

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Contracts\Events\ShouldDispatchAfterCommit;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class AnnouncementUnpublished implements ShouldBroadcastNow, ShouldDispatchAfterCommit
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public int $announcementId) {}

    public function broadcastOn(): PrivateChannel
    {
        return new PrivateChannel('announcements');
    }

    public function broadcastAs(): string
    {
        return 'announcement.changed';
    }

    /** @return array<string, int|string> */
    public function broadcastWith(): array
    {
        return [
            'announcement_id' => $this->announcementId,
            'action' => 'unpublished',
            'updated_at' => now()->utc()->toISOString(),
        ];
    }
}
