import { useEffect, useRef, useState, type RefObject } from "react";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { PurchaseRequestForm } from "@/components/purchase-request-form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatPercent, formatRelativeMinutes } from "@/lib/formatters";
import { formatPurchaseMoney, type PurchaseProduct, type TradeAction } from "@/lib/purchase";
import type { Transaction } from "@/lib/types";

export function PurchaseRequestModal({
  product,
  onClose,
  onSuccess,
  returnFocusRef,
  action = "buy",
}: {
  product: PurchaseProduct | null;
  onClose: () => void;
  onSuccess: (transaction: Transaction) => void;
  returnFocusRef: RefObject<HTMLElement | null>;
  action?: TradeAction;
}) {
  const actionLabel = action === "buy" ? "خرید" : "فروش";
  const [dirty, setDirty] = useState(false);
  const allowCloseRef = useRef(false);

  useEffect(() => {
    setDirty(false);
    allowCloseRef.current = false;
  }, [action, product?.id]);

  function requestClose() {
    if (
      !allowCloseRef.current &&
      dirty &&
      !window.confirm("اطلاعات واردشده ذخیره نشده است. آیا از بستن فرم مطمئن هستید؟")
    ) {
      return;
    }
    setDirty(false);
    onClose();
  }

  return (
    <Dialog
      open={Boolean(product)}
      onOpenChange={(open) => {
        if (!open) requestClose();
      }}
    >
      {product && (
        <DialogContent
          dir="rtl"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            window.requestAnimationFrame(() => returnFocusRef.current?.focus());
          }}
          className="bottom-0 top-auto max-h-[92dvh] max-w-none translate-y-0 overflow-y-auto rounded-t-2xl border-x-0 border-b-0 p-4 sm:bottom-auto sm:top-1/2 sm:max-w-2xl sm:-translate-y-1/2 sm:rounded-2xl sm:border sm:p-6"
        >
          <DialogHeader className="pe-8 text-start">
            <DialogTitle className="text-base font-extrabold sm:text-lg">
              ثبت درخواست {actionLabel}
            </DialogTitle>
            <DialogDescription className="text-[11px] leading-5 sm:text-xs">
              محصول انتخاب‌شده و قیمت فعلی را بررسی کنید، سپس مقدار {actionLabel} را وارد کنید.
            </DialogDescription>
          </DialogHeader>

          <SelectedProductSummary product={product} action={action} />

          <PurchaseRequestForm
            key={`${product.id}-${action}`}
            product={product}
            action={action}
            onDirtyChange={setDirty}
            onCancel={requestClose}
            onSuccess={(transaction) => {
              allowCloseRef.current = true;
              setDirty(false);
              onSuccess(transaction);
            }}
          />
        </DialogContent>
      )}
    </Dialog>
  );
}

function SelectedProductSummary({
  product,
  action,
}: {
  product: PurchaseProduct;
  action: TradeAction;
}) {
  const Icon = (product.change ?? 0) > 0 ? ArrowUp : (product.change ?? 0) < 0 ? ArrowDown : Minus;
  const trendTone =
    (product.change ?? 0) > 0
      ? "text-positive"
      : (product.change ?? 0) < 0
        ? "text-negative"
        : "text-muted-foreground";

  return (
    <section className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-border bg-muted/35 p-3">
      <div className="min-w-0">
        <h2 className="truncate text-sm font-extrabold">{product.title}</h2>
        <p className="mt-0.5 text-[10px] text-muted-foreground">
          هر {product.unit} · به‌روزرسانی {formatRelativeMinutes(product.updatedAt)}
        </p>
        {product.changePercent !== undefined && (
          <span
            className={`mt-1 inline-flex items-center gap-1 text-[10px] font-bold ${trendTone}`}
          >
            <Icon className="h-3 w-3" aria-hidden />
            تغییر قیمت {formatPercent(product.changePercent)}
          </span>
        )}
      </div>
      <div className="text-end">
        <span className="block text-[9px] text-muted-foreground">
          قیمت فعلی {action === "buy" ? "خرید" : "فروش"}
        </span>
        <strong
          className={`mt-1 block whitespace-nowrap text-xs font-extrabold tabular-nums sm:text-sm ${
            action === "buy" ? "text-positive" : "text-negative"
          }`}
        >
          {formatPurchaseMoney(product.unitPrice, product.priceUnit)}
        </strong>
      </div>
    </section>
  );
}
