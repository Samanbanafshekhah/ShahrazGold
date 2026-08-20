import type { AdminRequestStatus } from "@/lib/admin-data";

const TONES: Record<AdminRequestStatus, { label: string; className: string; dot: string }> = {
  pending: {
    label: "در انتظار بررسی",
    className:
      "bg-[color-mix(in_oklab,var(--warning)_14%,transparent)] text-[color:var(--warning)]",
    dot: "bg-[color:var(--warning)]",
  },
  approved: {
    label: "تایید شده",
    className: "bg-positive-soft text-positive",
    dot: "bg-[color:var(--positive)]",
  },
  rejected: {
    label: "رد شده",
    className: "bg-negative-soft text-negative",
    dot: "bg-[color:var(--negative)]",
  },
};

export function RequestStatusBadge({ status }: { status: AdminRequestStatus }) {
  const t = TONES[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${t.className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${t.dot}`} aria-hidden />
      {t.label}
    </span>
  );
}
