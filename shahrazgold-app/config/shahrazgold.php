<?php

return [
    'pricing' => [
        'gold18_from_mesghal_divisor' => env('SHAHRAZGOLD_GOLD18_DIVISOR', '4.3318'),
        'calculation_scale' => (int) env('SHAHRAZGOLD_CALCULATION_SCALE', 12),
        'quantity_scale' => (int) env('SHAHRAZGOLD_QUANTITY_SCALE', 6),
        'rounding' => 'nearest_rial',
    ],
    'presence' => [
        'driver' => env('SHAHRAZGOLD_PRESENCE_DRIVER', 'cache'),
        'ttl_seconds' => (int) env('SHAHRAZGOLD_PRESENCE_TTL', 90),
        'key_prefix' => env('SHAHRAZGOLD_PRESENCE_PREFIX', 'presence:user:'),
    ],
    'cors_allowed_origins' => array_values(array_filter(array_map(
        'trim',
        explode(',', (string) env('CORS_ALLOWED_ORIGINS', 'http://localhost:3000,http://localhost:5173'))
    ))),
];
