import { createFileRoute } from "@tanstack/react-router";
import { PublicHeader } from "@/components/public-header";
import { PublicFooter } from "@/components/public-footer";
import { Button } from "@/components/ui/button";
import { GoldPricePage } from "@/components/live-prices";
import { Clock8, History, Lock, Smartphone, Sparkles } from "lucide-react";

export const Route = createFileRoute("/")({
    component: Landing,
});

function Landing() {
    return (
        <div className="min-h-screen bg-background">
            <PublicHeader />

            {/* Hero */}
            <section className="relative overflow-hidden">
                <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_60%_at_80%_10%,color-mix(in_oklab,var(--gold)_18%,transparent),transparent_60%)]" />
                <div className="mx-auto max-w-[1440px] px-4 py-16 sm:px-6 lg:py-24">
                    <div className="flex max-w-3xl flex-col justify-center">
                        <span className="mb-4 inline-flex w-fit items-center gap-2 rounded-full border border-gold bg-gold-soft px-3 py-1 text-xs font-bold text-[color:var(--gold-dark)]">
                            <Sparkles className="h-3.5 w-3.5" />
                            مرجع شفاف قیمت طلا و سکه
                        </span>
                        <h1 className="text-3xl font-extrabold leading-tight sm:text-4xl lg:text-5xl">
                            قیمت‌های{" "}
                            <span className="text-[color:var(--gold-dark)]">طلا و سکه</span>، دقیق،
                            شفاف و در دسترس شما
                        </h1>
                        <p className="mt-5 max-w-xl text-base leading-8 text-muted-foreground">
                            شهراز‌گلد بستری حرفه‌ای برای مشاهده لحظه‌ای قیمت‌های بازار، پیگیری
                            تاریخچه معاملات و مدیریت حساب کاربری در یک محیط امن و ساده است.
                        </p>
                        <div className="mt-8 flex flex-wrap gap-3">
                            <Button
                                asChild
                                size="lg"
                                className="bg-gold text-primary-foreground hover:opacity-90"
                            >
                                <a href="#prices">مشاهده قیمت‌ها</a>
                            </Button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features */}
            <section id="features" className="border-t border-border bg-card/50 py-16">
                <div className="mx-auto max-w-[1440px] px-4 sm:px-6">
                    <div className="mb-10 text-center">
                        <h2 className="text-2xl font-black leading-tight tracking-tight sm:text-3xl lg:text-4xl">
                            چرا شهراز‌گلد؟
                        </h2>
                        <p className="mx-auto mt-3 max-w-2xl text-sm font-medium leading-7 text-muted-foreground sm:text-base">
                            مشاهده قیمت لحظه‌ای طلا و سکه و مدیریت معاملات در یک سامانه امن و ساده
                        </p>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {[
                            {
                                Icon: Clock8,
                                t: "قیمت لحظه‌ای طلا و سکه",
                                d: "قیمت روز طلای ۱۸ عیار، سکه امامی، نیم‌سکه، ربع‌سکه و اونس جهانی را آنلاین مشاهده کنید.",
                            },
                            {
                                Icon: Lock,
                                t: "خرید و فروش امن طلا",
                                d: "پس از ورود به حساب کاربری، درخواست خرید یا فروش طلا و سکه را با قیمت شفاف ثبت کنید.",
                            },
                            {
                                Icon: History,
                                t: "پیگیری درخواست و معامله",
                                d: "وضعیت درخواست‌های خرید و فروش و تاریخچه معاملات طلا و سکه را یکجا پیگیری کنید.",
                            },
                            {
                                Icon: Smartphone,
                                t: "دسترسی سریع در همه دستگاه‌ها",
                                d: "قیمت بازار طلا و امکانات شهراز‌گلد را در موبایل، تبلت و دسکتاپ به‌راحتی در اختیار داشته باشید.",
                            },
                        ].map(({ Icon, t, d }) => (
                            <div
                                key={t}
                                className="rounded-2xl border border-border bg-card p-5 shadow-elegant sm:p-6"
                            >
                                <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gold-soft text-[color:var(--gold-dark)]">
                                    <Icon className="h-5 w-5" />
                                </div>
                                <h3 className="text-base font-extrabold leading-7 tracking-tight sm:text-lg">
                                    {t}
                                </h3>
                                <p className="mt-2 text-sm font-normal leading-7 text-muted-foreground">
                                    {d}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Live Prices */}
            <section id="prices" className="border-t border-border py-16">
                <div className="mx-auto max-w-[1440px] px-4 sm:px-6">
                    <GoldPricePage showHeader={false} loginRequiredTrade />
                </div>
            </section>

            <PublicFooter />
        </div>
    );
}
