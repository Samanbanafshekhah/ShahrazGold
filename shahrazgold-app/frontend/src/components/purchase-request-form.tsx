import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { submitPurchase } from "@/lib/api-data";
import { apiRequest } from "@/lib/api";
import type { Transaction } from "@/lib/types";
import {
    calculatePurchase,
    formatPurchaseInput,
    formatPurchaseMoney,
    formatPurchaseQuantity,
    getPurchaseAvailabilityError,
    normalizePurchaseInput,
    type PurchaseMode,
    type PurchaseProduct,
    type TradeAction,
} from "@/lib/purchase";

export function PurchaseRequestForm({
    product,
    onCancel,
    onSuccess,
    onDirtyChange,
    action = "buy",
}: {
    product: PurchaseProduct;
    onCancel: () => void;
    onSuccess: (transaction: Transaction) => void;
    onDirtyChange?: (dirty: boolean) => void;
    action?: TradeAction;
}) {
    const actionLabel = action === "buy" ? "خرید" : "فروش";
    const isCountUnit = product.unit === "عدد";
    const amountId = useId();
    const quantityId = useId();
    const [mode, setMode] = useState<PurchaseMode>("amount");
    const [amount, setAmount] = useState("");
    const [quantity, setQuantity] = useState("");
    const [invalidInput, setInvalidInput] = useState(false);
    const [touched, setTouched] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const submittingRef = useRef(false);
    const [submitError, setSubmitError] = useState<string>();
    const [managerOnline, setManagerOnline] = useState<boolean | null>(null);
    const calculation = useMemo(
        () =>
            calculatePurchase(
                mode,
                amount,
                quantity,
                product.unitPrice,
                product.amountDivisor,
                product.finalAmountMultiplier,
            ),
        [
            amount,
            mode,
            product.amountDivisor,
            product.finalAmountMultiplier,
            product.unitPrice,
            quantity,
        ],
    );
    const availabilityError = getPurchaseAvailabilityError(product, action);
    const managerOfflineError =
        managerOnline === false
            ? "مدیر آفلاین است؛ در حال حاضر امکان ثبت درخواست خرید یا فروش وجود ندارد."
            : undefined;
    const activeValue = mode === "amount" ? amount : quantity;
    const invalidCount = isCountUnit && mode === "quantity" && !/^[1-9]\d*$/.test(quantity);
    const validationError =
        touched && (!activeValue || invalidInput || invalidCount || !calculation.valid)
            ? isCountUnit
                ? "تعداد باید یک عدد صحیح و بزرگ‌تر از صفر باشد."
                : "لطفاً یک مقدار معتبر و بزرگ‌تر از صفر وارد کنید."
            : undefined;
    const dirty = Boolean(amount || quantity);
    const canSubmit =
        !availabilityError &&
        !managerOfflineError &&
        !invalidInput &&
        !invalidCount &&
        calculation.valid &&
        !submitting;

    useEffect(() => {
        let active = true;
        const checkManagerStatus = () => {
            void apiRequest<{ online: boolean }>("manager-status", { authenticated: false })
                .then((response) => {
                    if (active) setManagerOnline(Boolean(response.data.online));
                })
                .catch(() => undefined);
        };
        checkManagerStatus();
        const timer = window.setInterval(checkManagerStatus, 3000);
        return () => {
            active = false;
            window.clearInterval(timer);
        };
    }, []);

    function updateDirty(nextAmount: string, nextQuantity: string) {
        onDirtyChange?.(Boolean(nextAmount || nextQuantity));
    }

    function changeMode(nextMode: PurchaseMode) {
        setMode(nextMode);
        setTouched(false);
        setInvalidInput(false);
        setSubmitError(undefined);
    }

    function resetForm() {
        setMode("amount");
        setAmount("");
        setQuantity("");
        setInvalidInput(false);
        setTouched(false);
        setSubmitError(undefined);
        onDirtyChange?.(false);
    }

    async function submitOrder() {
        setTouched(true);
        setSubmitError(undefined);
        const currentAvailabilityError = getPurchaseAvailabilityError(product, action);
        if (currentAvailabilityError || managerOfflineError) {
            setSubmitError(currentAvailabilityError ?? managerOfflineError);
            return;
        }
        if (!canSubmit || submittingRef.current) return;

        submittingRef.current = true;
        setSubmitting(true);
        try {
            const transaction = await submitPurchase({ product, action, mode, amount, quantity });
            toast.success(`درخواست ${actionLabel} ثبت شد و به مدیر ارسال شد.`);
            resetForm();
            onSuccess(transaction);
        } catch (error) {
            console.error(error);
            setSubmitError(
                error instanceof Error
                    ? error.message
                    : "ثبت درخواست با خطا روبه‌رو شد. لطفاً دوباره تلاش کنید.",
            );
        } finally {
            submittingRef.current = false;
            setSubmitting(false);
        }
    }

    return (
        <div className="grid gap-4">
            <div
                className="grid grid-cols-2 gap-1 rounded-xl border border-border bg-muted/45 p-1"
                role="tablist"
                aria-label={`روش ثبت ${actionLabel}`}
            >
                <button
                    type="button"
                    role="tab"
                    aria-selected={mode === "amount"}
                    onClick={() => changeMode("amount")}
                    className={
                        "rounded-lg px-3 py-2.5 text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring " +
                        (mode === "amount"
                            ? "bg-card text-[color:var(--gold-dark)] shadow-elegant"
                            : "text-muted-foreground hover:text-foreground")
                    }
                >
                    بر اساس مبلغ
                </button>
                <button
                    type="button"
                    role="tab"
                    aria-selected={mode === "quantity"}
                    onClick={() => changeMode("quantity")}
                    className={
                        "rounded-lg px-3 py-2.5 text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring " +
                        (mode === "quantity"
                            ? "bg-card text-[color:var(--gold-dark)] shadow-elegant"
                            : "text-muted-foreground hover:text-foreground")
                    }
                >
                    {isCountUnit ? "بر اساس تعداد" : "بر اساس وزن"}
                </button>
            </div>

            {mode === "amount" ? (
                <div className="grid gap-2">
                    <Label htmlFor={amountId} className="text-xs">
                        مبلغ {actionLabel} ({product.priceUnit})
                    </Label>
                    <Input
                        id={amountId}
                        inputMode="decimal"
                        autoFocus
                        value={formatPurchaseInput(amount, true)}
                        onBlur={() => setTouched(true)}
                        onChange={(event) => {
                            const normalized = normalizePurchaseInput(event.target.value, {
                                grouped: true,
                            });
                            setAmount(normalized.value);
                            setInvalidInput(normalized.invalid);
                            setSubmitError(undefined);
                            updateDirty(normalized.value, quantity);
                        }}
                        placeholder="مثلاً ۵٬۰۰۰٬۰۰۰"
                        aria-invalid={Boolean(validationError)}
                        aria-describedby={`${amountId}-help`}
                        className="h-11 rounded-xl bg-card text-sm tabular-nums"
                    />
                    <p id={`${amountId}-help`} className="text-[11px] text-muted-foreground">
                        {isCountUnit ? "تعداد تقریبی:" : "وزن تقریبی:"}{" "}
                        <b>{formatPurchaseQuantity(calculation.quantity, product.unit)}</b>
                    </p>
                </div>
            ) : (
                <div className="grid gap-2">
                    <Label htmlFor={quantityId} className="text-xs">
                        {isCountUnit
                            ? `تعداد ${actionLabel}`
                            : product.unit === "گرم"
                              ? "وزن به گرم"
                              : `مقدار ${actionLabel} به ${product.unit}`}
                    </Label>
                    <Input
                        id={quantityId}
                        inputMode={isCountUnit ? "numeric" : "decimal"}
                        autoFocus
                        value={formatPurchaseInput(quantity)}
                        onBlur={() => setTouched(true)}
                        onChange={(event) => {
                            const normalized = normalizePurchaseInput(event.target.value);
                            setQuantity(normalized.value);
                            setInvalidInput(normalized.invalid);
                            setSubmitError(undefined);
                            updateDirty(amount, normalized.value);
                        }}
                        placeholder={
                            isCountUnit
                                ? "مثلاً ۲"
                                : product.unit === "گرم"
                                  ? "مثلاً ۱.۵"
                                  : "مثلاً ۱"
                        }
                        aria-invalid={Boolean(validationError)}
                        aria-describedby={`${quantityId}-help`}
                        className="h-11 rounded-xl bg-card text-sm tabular-nums"
                    />
                    <p id={`${quantityId}-help`} className="text-[11px] text-muted-foreground">
                        مبلغ تقریبی:{" "}
                        <b>{formatPurchaseMoney(calculation.total, product.priceUnit)}</b>
                    </p>
                </div>
            )}

            {(validationError || availabilityError || managerOfflineError || submitError) && (
                <p
                    role="alert"
                    className="rounded-lg bg-negative-soft px-3 py-2 text-[11px] text-negative"
                >
                    {submitError ?? managerOfflineError ?? availabilityError ?? validationError}
                </p>
            )}

            <PurchaseSummary
                product={product}
                mode={mode}
                enteredValue={activeValue}
                quantity={calculation.quantity}
                total={calculation.total}
                action={action}
            />

            <p className="text-[10px] leading-5 text-muted-foreground sm:text-[11px]">
                مبلغ نهایی سفارش بر اساس قیمت تأییدشده در زمان بررسی درخواست محاسبه می‌شود. پرداخت
                آنلاین انجام نمی‌شود.
            </p>

            <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end">
                <Button
                    type="button"
                    variant="outline"
                    onClick={onCancel}
                    disabled={submitting}
                    className="h-10 rounded-xl text-xs sm:px-6"
                >
                    انصراف
                </Button>
                <Button
                    type="button"
                    disabled={!canSubmit}
                    onClick={submitOrder}
                    className="h-10 rounded-xl bg-gold text-xs font-bold text-primary-foreground hover:opacity-90 sm:px-7"
                >
                    {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    ثبت درخواست {actionLabel}
                </Button>
            </div>
            <span className="sr-only" aria-live="polite">
                {dirty ? "فرم دارای تغییرات ذخیره‌نشده است" : ""}
            </span>
        </div>
    );
}

function PurchaseSummary({
    product,
    mode,
    enteredValue,
    quantity,
    total,
    action,
}: {
    product: PurchaseProduct;
    mode: PurchaseMode;
    enteredValue: string;
    quantity: number;
    total: number;
    action: TradeAction;
}) {
    const isCountUnit = product.unit === "عدد";

    return (
        <section
            className="rounded-xl border border-border bg-muted/30 p-3"
            aria-labelledby="purchase-summary-title"
        >
            <h3 id="purchase-summary-title" className="text-xs font-bold">
                خلاصه درخواست
            </h3>
            <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2 text-[10px] sm:text-[11px]">
                <SummaryItem label="نوع درخواست" value={action === "buy" ? "خرید" : "فروش"} />
                <SummaryItem label="محصول" value={product.title} />
                <SummaryItem
                    label="قیمت واحد"
                    value={formatPurchaseMoney(product.unitPrice, product.priceUnit)}
                />
                <SummaryItem
                    label={
                        mode === "amount"
                            ? "مبلغ واردشده"
                            : isCountUnit
                              ? "تعداد واردشده"
                              : "مقدار واردشده"
                    }
                    value={
                        enteredValue &&
                        Number.isFinite(Number(enteredValue)) &&
                        Number(enteredValue) > 0
                            ? mode === "amount"
                                ? formatPurchaseMoney(Number(enteredValue), product.priceUnit)
                                : formatPurchaseQuantity(Number(enteredValue), product.unit)
                            : "—"
                    }
                />
                <SummaryItem
                    label={isCountUnit ? "تعداد" : "وزن تقریبی"}
                    value={formatPurchaseQuantity(quantity, product.unit)}
                />
                <SummaryItem
                    label="مبلغ تقریبی نهایی"
                    value={formatPurchaseMoney(total, product.priceUnit)}
                    emphasized
                />
                <SummaryItem label="واحد قیمت" value={product.priceUnit} />
            </dl>
        </section>
    );
}

function SummaryItem({
    label,
    value,
    emphasized,
}: {
    label: string;
    value: string;
    emphasized?: boolean;
}) {
    return (
        <div className="min-w-0">
            <dt className="text-muted-foreground">{label}</dt>
            <dd
                className={`mt-0.5 truncate tabular-nums ${emphasized ? "font-extrabold" : "font-bold"}`}
            >
                {value}
            </dd>
        </div>
    );
}
