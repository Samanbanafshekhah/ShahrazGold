<?php

namespace App\Services;

use App\Enums\PurchaseRequestStatus;
use App\Models\User;
use App\Services\Pricing\DecimalMath;

final class TransactionLimitService
{
    /** @var list<PurchaseRequestStatus> */
    private const CONSUMING_STATUSES = [
        PurchaseRequestStatus::Pending,
        PurchaseRequestStatus::Approved,
        PurchaseRequestStatus::Completed,
    ];

    public function getTransactionLimit(User $user): ?string
    {
        return $user->transaction_limit_rial === null
            ? null
            : (string) $user->transaction_limit_rial;
    }

    public function getUsedTransactionAmount(User $user): string
    {
        if (array_key_exists('transaction_limit_used_rial', $user->getAttributes())) {
            return (string) ($user->getAttribute('transaction_limit_used_rial') ?? 0);
        }

        return (string) $user->purchaseRequests()
            ->whereIn('status', array_map(
                static fn (PurchaseRequestStatus $status): string => $status->value,
                self::CONSUMING_STATUSES,
            ))
            ->sum('total_amount_rial');
    }

    public function getRemainingTransactionLimit(User $user): ?string
    {
        $limit = $this->getTransactionLimit($user);
        if ($limit === null) {
            return null;
        }

        $remaining = DecimalMath::sub($limit, $this->getUsedTransactionAmount($user), 0);

        return bccomp($remaining, '0', 0) > 0 ? $remaining : '0';
    }

    public function canCreateTransaction(User $user, string $amountRial): bool
    {
        $remaining = $this->getRemainingTransactionLimit($user);

        return $remaining === null || bccomp($amountRial, $remaining, 0) <= 0;
    }

    public function ensureCanCreateTransaction(User $user, string $amountRial): void
    {
        $remaining = $this->getRemainingTransactionLimit($user);
        if ($remaining === null || bccomp($amountRial, $remaining, 0) <= 0) {
            return;
        }

        if (bccomp($remaining, '0', 0) === 0) {
            abort(422, 'سقف مجاز معاملات شما تکمیل شده است. برای افزایش حد معامله با مدیریت تماس بگیرید.');
        }

        abort(422, sprintf(
            'مبلغ این معامله بیشتر از حد معامله باقی‌مانده شما است. سقف باقی‌مانده: %s تومان',
            $this->toPersianDigits(number_format(intdiv((int) $remaining, 10))),
        ));
    }

    /** @return array{limit: ?int, used: int, remaining: ?int, unlimited: bool} */
    public function summary(User $user): array
    {
        $limit = $this->getTransactionLimit($user);
        $used = $this->getUsedTransactionAmount($user);
        $calculatedRemaining = $limit === null ? null : DecimalMath::sub($limit, $used, 0);
        $remaining = $calculatedRemaining === null || bccomp($calculatedRemaining, '0', 0) > 0
            ? $calculatedRemaining
            : '0';

        return [
            'limit' => $limit === null ? null : (int) $limit,
            'used' => (int) $used,
            'remaining' => $remaining === null ? null : (int) $remaining,
            'unlimited' => $limit === null,
        ];
    }

    private function toPersianDigits(string $value): string
    {
        return strtr($value, [
            '0' => '۰', '1' => '۱', '2' => '۲', '3' => '۳', '4' => '۴',
            '5' => '۵', '6' => '۶', '7' => '۷', '8' => '۸', '9' => '۹',
        ]);
    }
}
