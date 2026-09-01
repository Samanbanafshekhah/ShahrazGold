import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { TransactionCard, TransactionTable } from "@/components/transaction-table";
import { EmptyState } from "@/components/empty-state";
import { PersianDatePicker } from "@/components/ui/persian-date-picker";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TRANSACTION_STATUS_LABELS, useTransactions } from "@/lib/api-data";
// بخش حسابداری موقتاً غیرفعال است.
// import { formatNumber } from "@/lib/formatters";
import type { TransactionStatus } from "@/lib/types";

export const Route = createFileRoute("/transactions/")({
    component: TransactionsPage,
    head: () => ({ meta: [{ title: "تراکنش‌ها | شهراز‌گلد" }] }),
});

type Filter = "all" | TransactionStatus;

function getTodayInputValue() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function TransactionsPage() {
    const { items: all } = useTransactions();
    const [filter, setFilter] = useState<Filter>("all");
    const [fromDate, setFromDate] = useState(getTodayInputValue);
    const [toDate, setToDate] = useState(getTodayInputValue);
    const items = useMemo(
        () =>
            all.filter((transaction) => {
                if (filter !== "all" && transaction.status !== filter) return false;
                const transactionDate = transaction.createdAt.slice(0, 10);
                if (fromDate && transactionDate < fromDate) return false;
                if (toDate && transactionDate > toDate) return false;
                return true;
            }),
        [all, filter, fromDate, toDate],
    );
    // محاسبه مانده ریال برای بخش حسابداری (موقتاً غیرفعال).
    // const rialBalance = useMemo(
    //     () =>
    //         all
    //             .filter(
    //                 (transaction) =>
    //                     transaction.status === "approved" || transaction.status === "completed",
    //             )
    //             .reduce((total, transaction) => total + transaction.total, 0),
    //     [all],
    // );
    const filters: { key: Filter; label: string }[] = [
        { key: "all", label: "همه" },
        ...(Object.entries(TRANSACTION_STATUS_LABELS) as [TransactionStatus, string][]).map(
            ([key, label]) => ({ key, label }),
        ),
    ];

    return (
        <AppShell>
            <div>
                <h1 className="text-2xl font-extrabold">تراکنش‌ها</h1>
                <p className="mt-1 text-sm text-muted-foreground">تاریخچه کامل خریدهای شما</p>
            </div>

            <Tabs defaultValue="transactions" dir="rtl" className="mt-5">
                <TabsList className="grid h-11 w-full grid-cols-1 sm:w-36">
                    <TabsTrigger value="transactions" className="h-9 font-bold">
                        تراکنش‌ها
                    </TabsTrigger>
                    {/*
                    <TabsTrigger value="accounting" className="h-9 font-bold">
                        حسابداری
                    </TabsTrigger>
                    */}
                </TabsList>

                <TabsContent value="transactions" className="mt-4">
                    <div className="grid grid-cols-2 gap-2 rounded-xl border border-border bg-card p-2.5 sm:max-w-xl sm:gap-3 sm:p-3">
                        <div className="min-w-0">
                            <label
                                htmlFor="transactions-from-date"
                                className="mb-1 block text-[10px] font-bold text-muted-foreground sm:text-[11px]"
                            >
                                از تاریخ
                            </label>
                            <PersianDatePicker
                                id="transactions-from-date"
                                value={fromDate}
                                max={toDate || undefined}
                                onChange={setFromDate}
                                className="text-[11px] sm:text-xs"
                            />
                        </div>
                        <div className="min-w-0">
                            <label
                                htmlFor="transactions-to-date"
                                className="mb-1 block text-[10px] font-bold text-muted-foreground sm:text-[11px]"
                            >
                                تا تاریخ
                            </label>
                            <PersianDatePicker
                                id="transactions-to-date"
                                value={toDate}
                                min={fromDate || undefined}
                                onChange={setToDate}
                                className="text-[11px] sm:text-xs"
                            />
                        </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                        {filters.map((f) => (
                            <button
                                key={f.key}
                                onClick={() => setFilter(f.key)}
                                className={
                                    "rounded-full border px-3 py-1.5 text-xs font-bold transition " +
                                    (filter === f.key
                                        ? "border-[color:var(--gold)] bg-gold-soft text-[color:var(--gold-dark)]"
                                        : "border-border text-muted-foreground hover:bg-muted")
                                }
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>
                    <div className="mt-6 hidden lg:block">
                        {items.length ? (
                            <TransactionTable items={items} />
                        ) : (
                            <EmptyState title="تراکنشی یافت نشد." />
                        )}
                    </div>
                    <div className="mt-6 grid gap-3 lg:hidden">
                        {items.length ? (
                            items.map((t) => <TransactionCard key={t.id} t={t} />)
                        ) : (
                            <EmptyState title="تراکنشی یافت نشد." />
                        )}
                    </div>
                </TabsContent>

                {/*
                <TabsContent value="accounting" className="mt-4">
                    <section className="rounded-2xl border border-border bg-card p-5 shadow-elegant sm:p-6">
                        <p className="text-sm font-bold text-muted-foreground">مانده ریال</p>
                        <div className="mt-3 flex flex-wrap items-baseline gap-2">
                            <strong
                                className="text-2xl font-extrabold tabular-nums text-[color:var(--gold-dark)] sm:text-3xl"
                                dir="ltr"
                            >
                                {formatNumber(rialBalance)}
                            </strong>
                            <span className="text-sm font-bold text-muted-foreground">ریال</span>
                        </div>
                    </section>
                </TabsContent>
                */}
            </Tabs>
        </AppShell>
    );
}
