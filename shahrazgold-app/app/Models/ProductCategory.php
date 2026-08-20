<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class ProductCategory extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = ['title', 'slug', 'description', 'icon', 'image_path', 'is_active', 'display_order'];

    protected function casts(): array
    {
        return ['is_active' => 'boolean', 'display_order' => 'integer'];
    }

    public function products(): HasMany
    {
        return $this->hasMany(Product::class);
    }
}
