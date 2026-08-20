<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AppSetting extends Model
{
    public const MANAGER_ONLINE = 'manager_online';

    public $incrementing = false;

    protected $primaryKey = 'key';

    protected $keyType = 'string';

    protected $fillable = ['key', 'value'];

    public static function managerOnline(): bool
    {
        return static::query()->whereKey(self::MANAGER_ONLINE)->value('value') === '1';
    }

    public static function setManagerOnline(bool $online): self
    {
        return static::query()->updateOrCreate(
            ['key' => self::MANAGER_ONLINE],
            ['value' => $online ? '1' : '0'],
        );
    }
}
