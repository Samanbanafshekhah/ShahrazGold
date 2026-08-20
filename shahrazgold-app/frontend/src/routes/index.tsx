import { createFileRoute } from "@tanstack/react-router";
import { PublicHeader } from "@/components/public-header";
import { PublicFooter } from "@/components/public-footer";
import { Button } from "@/components/ui/button";
import { PriceCard } from "@/components/price-card";
import { GoldPricePage } from "@/components/live-prices";
import { useAssets } from "@/lib/api-data";
import { Clock8, History, Lock, Smartphone, Sparkles } from "lucide-react";

export const Route = createFileRoute("/")({
    component: Landing,
});

function Landing() {
    const { items: assets } = useAssets();
    const featured = assets.filter((asset) =>
        ["GOLD18", "EMAMI", "OUNCE", "HALF"].includes(asset.symbol),
    );

    return (
        <div className="min-h-screen bg-background">
            <PublicHeader />

            {/* Hero */}
            <section className="relative overflow-hidden">
                <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_60%_at_80%_10%,color-mix(in_oklab,var(--gold)_18%,transparent),transparent_60%)]" />
                <div className="mx-auto grid max-w-[1440px] gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:py-24">
                    <div className="flex flex-col justify-center">
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

                    <div className="relative">
                        <div className="absolute -inset-6 -z-10 rounded-[3rem] bg-gradient-to-br from-[color:var(--gold-soft)] to-transparent blur-2xl" />
                        <div className="rounded-3xl border border-border bg-card p-6 shadow-elegant">
                            <div className="mb-4 flex items-center justify-between">
                                <div>
                                    <div className="text-xs text-muted-foreground">
                                        نمای کلی بازار
                                    </div>
                                    <div className="text-sm font-bold">قیمت‌های منتخب</div>
                                </div>
                                <span className="inline-flex items-center gap-1 rounded-full bg-positive-soft px-2 py-1 text-[11px] font-bold text-positive">
                                    <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--positive)]" />
                                    بازار باز
                                </span>
                            </div>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                {featured.map((a) => (
                                    <PriceCard key={a.symbol} asset={a} />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features */}
            <section id="features" className="border-t border-border bg-card/50 py-16">
                <div className="mx-auto max-w-[1440px] px-4 sm:px-6">
                    <div className="mb-10 text-center">
                        <h2 className="text-2xl font-extrabold sm:text-3xl">چرا شهراز‌گلد؟</h2>
                        <p className="mt-2 text-sm text-muted-foreground">
                            تجربه‌ای حرفه‌ای برای دنبال کردن بازار طلا و سکه
                        </p>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {[
                            {
                                Icon: Clock8,
                                t: "قیمت‌های به‌روز",
                                d: "دریافت لحظه‌ای قیمت طلا، سکه و اونس جهانی.",
                            },
                            {
                                Icon: Lock,
                                t: "حساب کاربری امن",
                                d: "ورود امن و مدیریت نشست با Laravel Sanctum.",
                            },
                            {
                                Icon: History,
                                t: "سابقه معاملات",
                                d: "دسترسی سریع به تمامی تراکنش‌های شما.",
                            },
                            {
                                Icon: Smartphone,
                                t: "تجربه واکنش‌گرا",
                                d: "طراحی روان روی موبایل، تبلت و دسکتاپ.",
                            },
                        ].map(({ Icon, t, d }) => (
                            <div
                                key={t}
                                className="rounded-2xl border border-border bg-card p-5 shadow-elegant"
                            >
                                <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gold-soft text-[color:var(--gold-dark)]">
                                    <Icon className="h-5 w-5" />
                                </div>
                                <h3 className="text-sm font-bold">{t}</h3>
                                <p className="mt-1 text-xs leading-6 text-muted-foreground">{d}</p>
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
