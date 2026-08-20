import type { TransactionStatus } from "@/lib/types";
import { STATUS_TONE } from "@/lib/status";

export function StatusBadge({ status }: { status: TransactionStatus }) {
  const t = STATUS_TONE[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${t.bg} ${t.fg}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${t.dot}`} aria-hidden />
      {t.label}
    </span>
  );
}