import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Info, AlertTriangle, Star, Save, Eraser } from "lucide-react";
import { AdminPage } from "@/components/admin/admin-page";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PersianDateTimePicker } from "@/components/ui/persian-date-picker";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    useAdminAnnouncement,
    saveAnnouncement,
    clearAnnouncement,
    type AdminAnnouncement,
} from "@/lib/admin-data";
import { toPersianDigits } from "@/lib/formatters";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/announcement")({
    component: AnnouncementPage,
});

const MAX = 500;

function AnnouncementPage() {
    const stored = useAdminAnnouncement();
    const [draft, setDraft] = useState<AdminAnnouncement>(stored);

    useEffect(() => {
        setDraft(stored);
    }, [stored]);

    async function save() {
        if (!draft.text.trim()) {
            toast.error("متن اطلاعیه نمی‌تواند خالی باشد.");
            return;
        }
        await saveAnnouncement(draft);
        toast.success("اطلاعیه با موفقیت ذخیره شد.");
    }

    async function reset() {
        await clearAnnouncement();
        toast.success("اطلاعیه پاک شد.");
    }

    const tone: Record<
        AdminAnnouncement["kind"],
        { icon: typeof Info; className: string; label: string }
    > = {
        info: {
            icon: Info,
            className: "bg-gold-soft text-[color:var(--gold-dark)] border-[color:var(--gold)]/30",
            label: "اطلاع‌رسانی",
        },
        warning: {
            icon: AlertTriangle,
            className:
                "bg-[color-mix(in_oklab,var(--warning)_14%,transparent)] text-[color:var(--warning)] border-[color:var(--warning)]/40",
            label: "هشدار",
        },
        important: {
            icon: Star,
            className: "bg-negative-soft text-negative border-[color:var(--negative)]/40",
            label: "مهم",
        },
    };
    const T = tone[draft.kind];

    return (
        <AdminPage title="اطلاعیه بازار" subtitle="متنی که در صفحه اصلی مشتریان نمایش داده می‌شود">
            <div className="grid gap-4 lg:grid-cols-2">
                <section className="space-y-4 rounded-2xl border border-border bg-card p-4 shadow-elegant sm:p-5">
                    <div className="space-y-1.5">
                        <Label htmlFor="ann-text">متن اطلاعیه</Label>
                        <Textarea
                            id="ann-text"
                            rows={8}
                            maxLength={MAX}
                            value={draft.text}
                            onChange={(e) => setDraft((d) => ({ ...d, text: e.target.value }))}
                            placeholder="متن اطلاعیه بازار..."
                        />
                        <div className="flex justify-end text-[11px] text-muted-foreground">
                            {toPersianDigits(draft.text.length)} / {toPersianDigits(MAX)}
                        </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1.5">
                            <Label>نوع اطلاعیه</Label>
                            <Select
                                value={draft.kind}
                                onValueChange={(v) =>
                                    setDraft((d) => ({
                                        ...d,
                                        kind: v as AdminAnnouncement["kind"],
                                    }))
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="info">اطلاع‌رسانی</SelectItem>
                                    <SelectItem value="warning">هشدار</SelectItem>
                                    <SelectItem value="important">مهم</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-border p-3">
                            <div className="min-w-0">
                                <div className="text-sm font-bold">وضعیت نمایش</div>
                                <div className="mt-1 text-[11px] leading-5 text-muted-foreground">
                                    در صورت غیرفعال بودن، برای مشتریان نمایش داده نمی‌شود.
                                </div>
                            </div>
                            <Switch
                                className="shrink-0"
                                checked={draft.active}
                                onCheckedChange={(v) => setDraft((d) => ({ ...d, active: v }))}
                            />
                        </div>
                        <div className="space-y-1.5 sm:col-span-2">
                            <Label>تاریخ و ساعت شروع</Label>
                            <PersianDateTimePicker
                                value={draft.startAt}
                                onChange={(value) =>
                                    setDraft((d) => ({ ...d, startAt: value }))
                                }
                                placeholder="تاریخ شروع"
                            />
                        </div>
                        <div className="space-y-1.5 sm:col-span-2">
                            <Label>تاریخ و ساعت پایان</Label>
                            <PersianDateTimePicker
                                value={draft.endAt}
                                onChange={(value) =>
                                    setDraft((d) => ({ ...d, endAt: value }))
                                }
                                placeholder="تاریخ پایان"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2 sm:flex sm:flex-wrap">
                        <Button onClick={save} className="w-full sm:w-auto">
                            <Save className="me-1 h-4 w-4" />
                            ذخیره اطلاعیه
                        </Button>
                        <Button variant="outline" onClick={reset} className="w-full sm:w-auto">
                            <Eraser className="me-1 h-4 w-4" />
                            پاک کردن
                        </Button>
                    </div>
                </section>

                <section className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-elegant sm:p-5">
                    <div className="flex flex-col items-start gap-1 sm:flex-row sm:items-center sm:justify-between">
                        <h2 className="text-sm font-bold">پیش‌نمایش زنده</h2>
                        <span className="text-[11px] text-muted-foreground">
                            همان‌طور که در سایت مشتریان دیده می‌شود
                        </span>
                    </div>
                    <div
                        className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm leading-7 ${T.className}`}
                    >
                        <T.icon className="mt-0.5 h-5 w-5 shrink-0" />
                        <div className="min-w-0">
                            <div className="mb-1 text-xs font-bold opacity-80">{T.label}</div>
                            <p className="whitespace-pre-line break-words [overflow-wrap:anywhere]">
                                {draft.text || "متنی وارد نشده است."}
                            </p>
                        </div>
                    </div>
                    {!draft.active && (
                        <div className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">
                            این اطلاعیه در حال حاضر غیرفعال است و به مشتریان نمایش داده نمی‌شود.
                        </div>
                    )}
                </section>
            </div>
        </AdminPage>
    );
}
