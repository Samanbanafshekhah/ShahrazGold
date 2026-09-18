import { createFileRoute } from "@tanstack/react-router";
import {
    AlertTriangle,
    CheckCircle2,
    Loader2,
    MessageSquareText,
    Search,
    Send,
    Users,
    XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AdminPage } from "@/components/admin/admin-page";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiErrorMessage, apiRequest } from "@/lib/api";
import { toPersianDigits } from "@/lib/formatters";

export const Route = createFileRoute("/admin/sms")({
    component: SmsPage,
    head: () => ({ meta: [{ title: "ارسال پیامک | شهراز‌گلد" }] }),
});

type Audience = "selected" | "all_active";

type Recipient = {
    id: number;
    name: string;
    mobile: string;
    is_active: boolean;
};

type SendResult = {
    recipient_count: number;
    accepted_count: number;
    failed_count: number;
};

const MAX_MESSAGE_LENGTH = 1800;

function estimateParts(message: string): number {
    if (!message.length) return 0;
    const isUnicode = [...message].some((character) => (character.codePointAt(0) ?? 0) > 127);
    const singlePartLength = isUnicode ? 70 : 160;
    const multipartLength = isUnicode ? 67 : 153;

    return message.length <= singlePartLength ? 1 : Math.ceil(message.length / multipartLength);
}

function SmsPage() {
    const [recipients, setRecipients] = useState<Recipient[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");
    const [audience, setAudience] = useState<Audience>("selected");
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [search, setSearch] = useState("");
    const [message, setMessage] = useState("");
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState<SendResult | null>(null);

    useEffect(() => {
        let active = true;
        setLoading(true);
        apiRequest<Recipient[]>("admin/sms/recipients")
            .then((response) => {
                if (active) setRecipients(response.data);
            })
            .catch((error) => {
                if (active)
                    setLoadError(apiErrorMessage(error, "دریافت فهرست کاربران ناموفق بود."));
            })
            .finally(() => {
                if (active) setLoading(false);
            });

        return () => {
            active = false;
        };
    }, []);

    const filteredRecipients = useMemo(() => {
        const query = search.trim().toLocaleLowerCase("fa-IR");
        if (!query) return recipients;

        return recipients.filter((recipient) =>
            `${recipient.name} ${recipient.mobile}`.toLocaleLowerCase("fa-IR").includes(query),
        );
    }, [recipients, search]);

    const activeCount = recipients.filter((recipient) => recipient.is_active).length;
    const recipientCount = audience === "all_active" ? activeCount : selectedIds.size;
    const parts = estimateParts(message.trim());
    const estimatedMessages = recipientCount * parts;
    const allVisibleSelected =
        filteredRecipients.length > 0 &&
        filteredRecipients.every((recipient) => selectedIds.has(recipient.id));

    function toggleRecipient(id: number, checked: boolean) {
        setSelectedIds((current) => {
            const next = new Set(current);
            if (checked) next.add(id);
            else next.delete(id);
            return next;
        });
        setResult(null);
    }

    function toggleVisibleRecipients() {
        setSelectedIds((current) => {
            const next = new Set(current);
            if (allVisibleSelected) {
                filteredRecipients.forEach((recipient) => next.delete(recipient.id));
            } else {
                filteredRecipients.forEach((recipient) => next.add(recipient.id));
            }
            return next;
        });
        setResult(null);
    }

    function prepareSend() {
        if (!message.trim()) {
            toast.error("متن پیامک را وارد کنید.");
            return;
        }
        if (recipientCount === 0) {
            toast.error("حداقل یک گیرنده را انتخاب کنید.");
            return;
        }
        setConfirmOpen(true);
    }

    async function sendSms() {
        setConfirmOpen(false);
        setSubmitting(true);
        setResult(null);

        try {
            const response = await apiRequest<SendResult>("admin/sms", {
                method: "POST",
                body: JSON.stringify({
                    audience,
                    user_ids: audience === "selected" ? Array.from(selectedIds) : undefined,
                    message: message.trim(),
                }),
            });
            setResult(response.data);
            if (response.data.failed_count > 0) {
                toast.warning(response.message);
            } else {
                toast.success(response.message);
                setMessage("");
                if (audience === "selected") setSelectedIds(new Set());
            }
        } catch (error) {
            toast.error(apiErrorMessage(error, "ارسال پیامک ناموفق بود."));
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <AdminPage title="ارسال پیامک" subtitle="ارسال پیام دلخواه به یک، چند یا همه کاربران فعال">
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
                <section className="space-y-5 rounded-2xl border border-border bg-card p-4 shadow-elegant sm:p-5">
                    <div>
                        <h2 className="text-sm font-extrabold">۱. انتخاب گیرندگان</h2>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">
                            ارسال به کاربران انتخابی یا تمام حساب‌های فعال سامانه
                        </p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                        <button
                            type="button"
                            onClick={() => {
                                setAudience("selected");
                                setResult(null);
                            }}
                            className={
                                "rounded-xl border p-4 text-right transition " +
                                (audience === "selected"
                                    ? "border-[color:var(--gold)] bg-gold-soft"
                                    : "border-border hover:bg-muted/60")
                            }
                        >
                            <div className="flex items-center gap-2 text-sm font-extrabold">
                                <Users className="h-4 w-4" />
                                کاربران انتخابی
                            </div>
                            <div className="mt-2 text-xs text-muted-foreground">
                                {toPersianDigits(selectedIds.size)} کاربر انتخاب شده
                            </div>
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setAudience("all_active");
                                setResult(null);
                            }}
                            className={
                                "rounded-xl border p-4 text-right transition " +
                                (audience === "all_active"
                                    ? "border-[color:var(--gold)] bg-gold-soft"
                                    : "border-border hover:bg-muted/60")
                            }
                        >
                            <div className="flex items-center gap-2 text-sm font-extrabold">
                                <MessageSquareText className="h-4 w-4" />
                                همه کاربران فعال
                            </div>
                            <div className="mt-2 text-xs text-muted-foreground">
                                {toPersianDigits(activeCount)} گیرنده
                            </div>
                        </button>
                    </div>

                    {audience === "selected" && (
                        <div className="space-y-3">
                            <div className="relative">
                                <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    value={search}
                                    onChange={(event) => setSearch(event.target.value)}
                                    placeholder="جستجو بر اساس نام یا شماره موبایل"
                                    className="pr-9"
                                />
                            </div>

                            <div className="flex items-center justify-between text-xs">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={toggleVisibleRecipients}
                                    disabled={loading || filteredRecipients.length === 0}
                                >
                                    {allVisibleSelected
                                        ? "حذف انتخاب‌های نمایش‌داده‌شده"
                                        : "انتخاب همه نمایش‌داده‌شده‌ها"}
                                </Button>
                                <span className="text-muted-foreground">
                                    {toPersianDigits(selectedIds.size)} انتخاب
                                </span>
                            </div>

                            <div className="max-h-80 space-y-2 overflow-y-auto rounded-xl border border-border p-2">
                                {loading && (
                                    <div className="flex items-center justify-center gap-2 py-12 text-xs text-muted-foreground">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        در حال دریافت کاربران…
                                    </div>
                                )}
                                {!loading && loadError && (
                                    <div className="py-10 text-center text-xs text-negative">
                                        {loadError}
                                    </div>
                                )}
                                {!loading && !loadError && filteredRecipients.length === 0 && (
                                    <div className="py-10 text-center text-xs text-muted-foreground">
                                        کاربری پیدا نشد.
                                    </div>
                                )}
                                {!loading &&
                                    !loadError &&
                                    filteredRecipients.map((recipient) => (
                                        <label
                                            key={recipient.id}
                                            className="flex cursor-pointer items-center gap-3 rounded-lg border border-transparent p-3 transition hover:border-border hover:bg-muted/50"
                                        >
                                            <Checkbox
                                                checked={selectedIds.has(recipient.id)}
                                                onCheckedChange={(checked) =>
                                                    toggleRecipient(recipient.id, checked === true)
                                                }
                                            />
                                            <span className="min-w-0 flex-1">
                                                <span className="block truncate text-sm font-bold">
                                                    {recipient.name || "بدون نام"}
                                                </span>
                                                <span
                                                    dir="ltr"
                                                    className="block text-right text-xs text-muted-foreground"
                                                >
                                                    {recipient.mobile}
                                                </span>
                                            </span>
                                            <span
                                                className={
                                                    "shrink-0 rounded-full px-2 py-1 text-[10px] font-bold " +
                                                    (recipient.is_active
                                                        ? "bg-positive-soft text-positive"
                                                        : "bg-muted text-muted-foreground")
                                                }
                                            >
                                                {recipient.is_active ? "فعال" : "غیرفعال"}
                                            </span>
                                        </label>
                                    ))}
                            </div>
                        </div>
                    )}

                    {audience === "all_active" && (
                        <div className="flex gap-3 rounded-xl border border-[color:var(--gold)]/40 bg-gold-soft p-4 text-xs leading-6 text-[color:var(--gold-dark)]">
                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                            پیام برای تمام کاربران فعال ارسال می‌شود. قبل از تأیید نهایی، متن و
                            تعداد گیرندگان را دوباره بررسی کنید.
                        </div>
                    )}
                </section>

                <section className="space-y-5 rounded-2xl border border-border bg-card p-4 shadow-elegant sm:p-5">
                    <div>
                        <h2 className="text-sm font-extrabold">۲. متن پیامک</h2>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">
                            متن نهایی بدون قالب تأیید کاوه‌نگار و از خط عمومی پیامک ارسال می‌شود.
                        </p>
                    </div>

                    <div>
                        <Label htmlFor="sms-message" className="mb-2 block">
                            متن پیام
                        </Label>
                        <Textarea
                            id="sms-message"
                            value={message}
                            onChange={(event) => {
                                setMessage(event.target.value);
                                setResult(null);
                            }}
                            maxLength={MAX_MESSAGE_LENGTH}
                            rows={8}
                            placeholder="متن پیامک را اینجا بنویسید…"
                            className="resize-y leading-7"
                        />
                        <div className="mt-2 flex flex-wrap justify-between gap-2 text-[11px] text-muted-foreground">
                            <span>
                                {toPersianDigits(message.length)} از{" "}
                                {toPersianDigits(MAX_MESSAGE_LENGTH)} کاراکتر
                            </span>
                            <span>حدود {toPersianDigits(parts)} بخش برای هر گیرنده</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 rounded-xl bg-muted/60 p-3 text-center">
                        <div>
                            <div className="text-lg font-black">
                                {toPersianDigits(recipientCount)}
                            </div>
                            <div className="text-[10px] text-muted-foreground">گیرنده</div>
                        </div>
                        <div>
                            <div className="text-lg font-black">{toPersianDigits(parts)}</div>
                            <div className="text-[10px] text-muted-foreground">بخش پیام</div>
                        </div>
                        <div>
                            <div className="text-lg font-black">
                                {toPersianDigits(estimatedMessages)}
                            </div>
                            <div className="text-[10px] text-muted-foreground">ارسال تخمینی</div>
                        </div>
                    </div>

                    <Button
                        type="button"
                        onClick={prepareSend}
                        disabled={submitting || loading || !message.trim() || recipientCount === 0}
                        className="h-11 w-full"
                    >
                        {submitting ? (
                            <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Send className="ml-2 h-4 w-4" />
                        )}
                        {submitting ? "در حال ارسال…" : "بررسی و ارسال پیامک"}
                    </Button>

                    {result && (
                        <div
                            className={
                                "rounded-xl border p-4 " +
                                (result.failed_count > 0
                                    ? "border-negative/30 bg-negative-soft"
                                    : "border-positive/30 bg-positive-soft")
                            }
                        >
                            <div className="flex items-center gap-2 text-sm font-extrabold">
                                {result.failed_count > 0 ? (
                                    <XCircle className="h-5 w-5 text-negative" />
                                ) : (
                                    <CheckCircle2 className="h-5 w-5 text-positive" />
                                )}
                                نتیجه ارسال
                            </div>
                            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                                <div>
                                    <strong className="block text-base">
                                        {toPersianDigits(result.recipient_count)}
                                    </strong>
                                    کل
                                </div>
                                <div>
                                    <strong className="block text-base text-positive">
                                        {toPersianDigits(result.accepted_count)}
                                    </strong>
                                    پذیرفته‌شده
                                </div>
                                <div>
                                    <strong className="block text-base text-negative">
                                        {toPersianDigits(result.failed_count)}
                                    </strong>
                                    ناموفق
                                </div>
                            </div>
                        </div>
                    )}
                </section>
            </div>

            <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <AlertDialogContent dir="rtl">
                    <AlertDialogHeader className="text-right sm:text-right">
                        <AlertDialogTitle>ارسال پیامک تأیید شود؟</AlertDialogTitle>
                        <AlertDialogDescription className="text-right leading-6">
                            این پیام برای {toPersianDigits(recipientCount)} گیرنده ارسال می‌شود و
                            حدود {toPersianDigits(estimatedMessages)} بخش پیامک مصرف می‌کند. بعد از
                            ارسال امکان لغو از داخل پنل وجود ندارد.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="max-h-32 overflow-y-auto rounded-lg bg-muted p-3 text-sm leading-6">
                        {message.trim()}
                    </div>
                    <AlertDialogFooter className="gap-2 sm:space-x-0">
                        <AlertDialogCancel>انصراف</AlertDialogCancel>
                        <AlertDialogAction onClick={() => void sendSms()}>
                            تأیید و ارسال
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </AdminPage>
    );
}
