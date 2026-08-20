<?php

namespace App\Models;

use App\Enums\AnnouncementStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class MarketAnnouncement extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = ['title', 'body', 'status', 'starts_at', 'ends_at', 'published_at', 'created_by', 'updated_by'];

    protected function casts(): array
    {
        return ['status' => AnnouncementStatus::class, 'starts_at' => 'immutable_datetime', 'ends_at' => 'immutable_datetime', 'published_at' => 'immutable_datetime'];
    }
}
