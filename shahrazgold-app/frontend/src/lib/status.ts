import type { TransactionStatus, TransactionType } from "./types";

export const STATUS_TONE: Record<
  TransactionStatus,
  { label: string; bg: string; fg: string; dot: string }
> = {
  pending: {
    label: "در انتظار بررسی",
    bg: "bg-[color-mix(in_oklab,var(--warning)_14%,transparent)]",
    fg: "text-[color:var(--warning)]",
    dot: "bg-[color:var(--warning)]",
  },
  approved: {
    label: "تأییدشده",
    bg: "bg-gold-soft",
    fg: "text-[color:var(--gold-dark)]",
    dot: "bg-[color:var(--gold-dark)]",
  },
  completed: {
    label: "تکمیل‌شده",
    bg: "bg-positive-soft",
    fg: "text-positive",
    dot: "bg-[color:var(--positive)]",
  },
  rejected: {
    label: "ردشده",
    bg: "bg-negative-soft",
    fg: "text-negative",
    dot: "bg-[color:var(--negative)]",
  },
  canceled: {
    label: "لغوشده",
    bg: "bg-muted",
    fg: "text-muted-foreground",
    dot: "bg-muted-foreground",
  },
};

export const TYPE_TONE: Record<TransactionType, { label: string; className: string }> = {
  buy: { label: "خرید", className: "text-positive" },
  sell: { label: "فروش", className: "text-negative" },
};
