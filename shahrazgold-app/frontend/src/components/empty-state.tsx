import type { ReactNode } from "react";
import { Inbox } from "lucide-react";

export function EmptyState({
  title = "چیزی برای نمایش وجود ندارد.",
  description,
  icon,
  action,
}: {
  title?: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 px-6 py-14 text-center">
      <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gold-soft text-[color:var(--gold-dark)]">
        {icon ?? <Inbox className="h-6 w-6" />}
      </div>
      <h3 className="text-sm font-bold">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-xs text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({
  title = "خطایی رخ داد",
  description = "لطفاً دوباره تلاش کنید.",
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[color:var(--negative)]/40 bg-negative-soft px-6 py-10 text-center">
      <h3 className="text-sm font-bold text-negative">{title}</h3>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 rounded-lg border border-border bg-background px-3 py-2 text-xs font-bold hover:bg-muted"
        >
          تلاش مجدد
        </button>
      )}
    </div>
  );
}