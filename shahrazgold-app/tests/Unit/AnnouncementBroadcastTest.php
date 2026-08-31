<?php

namespace Tests\Unit;

use App\Events\AnnouncementPublished;
use App\Events\AnnouncementUnpublished;
use App\Models\MarketAnnouncement;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Tests\TestCase;

class AnnouncementBroadcastTest extends TestCase
{
    public function test_announcement_changes_broadcast_on_the_customer_channel(): void
    {
        $announcement = new MarketAnnouncement;
        $announcement->forceFill(['id' => 42]);

        $published = new AnnouncementPublished($announcement);
        $unpublished = new AnnouncementUnpublished(42);

        $this->assertInstanceOf(ShouldBroadcastNow::class, $published);
        $this->assertInstanceOf(ShouldBroadcastNow::class, $unpublished);
        $this->assertSame('private-announcements', $published->broadcastOn()->name);
        $this->assertSame('private-announcements', $unpublished->broadcastOn()->name);
        $this->assertSame('announcement.changed', $published->broadcastAs());
        $this->assertSame('announcement.changed', $unpublished->broadcastAs());
        $this->assertSame('published', $published->broadcastWith()['action']);
        $this->assertSame('unpublished', $unpublished->broadcastWith()['action']);
    }
}
