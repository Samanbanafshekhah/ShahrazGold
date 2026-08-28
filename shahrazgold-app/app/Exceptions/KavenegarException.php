<?php

namespace App\Exceptions;

use RuntimeException;

class KavenegarException extends RuntimeException
{
    public function __construct(
        string $message,
        public readonly ?int $providerStatus = null,
        ?\Throwable $previous = null,
    ) {
        parent::__construct($message, 0, $previous);
    }
}
