import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateProfile, useCurrentUser } from "@/lib/auth";
import { ArrowRight } from "lucide-react";

export const Route = createFileRoute("/profile/edit")({
    component: EditProfilePage,
    head: () => ({ meta: [{ title: "ویرایش پروفایل | شهراز‌گلد" }] }),
});

function EditProfilePage() {
    const user = useCurrentUser();
    const nav = useNavigate();
    const [firstName, setFirst] = useState("");
    const [lastName, setLast] = useState("");
    const [email, setEmail] = useState("");

    useEffect(() => {
        if (!user) return;
        setFirst(user.firstName);
        setLast(user.lastName);
        setEmail(user.email ?? "");
    }, [user]);

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        const result = await updateProfile({
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            email: email.trim() || undefined,
        });
        if (result.ok) {
            toast.success("پروفایل به‌روزرسانی شد.");
            nav({ to: "/profile" });
        } else {
            toast.error(result.error ?? "به‌روزرسانی پروفایل ناموفق بود.");
        }
    }

    return (
        <AppShell>
            <Link
                to="/profile"
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
                <ArrowRight className="h-3.5 w-3.5" /> بازگشت به پروفایل
            </Link>
            <section className="mt-4 rounded-3xl border border-border bg-card p-6 shadow-elegant sm:p-8">
                <h1 className="text-2xl font-extrabold">ویرایش پروفایل</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    اطلاعات شخصی خود را به‌روز نگه دارید.
                </p>
                <form onSubmit={onSubmit} className="mt-6 space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <Label htmlFor="first">نام</Label>
                            <Input
                                id="first"
                                value={firstName}
                                onChange={(e) => setFirst(e.target.value)}
                                className="mt-1.5 h-11"
                            />
                        </div>
                        <div>
                            <Label htmlFor="last">نام خانوادگی</Label>
                            <Input
                                id="last"
                                value={lastName}
                                onChange={(e) => setLast(e.target.value)}
                                className="mt-1.5 h-11"
                            />
                        </div>
                    </div>
                    <div>
                        <Label htmlFor="email">ایمیل</Label>
                        <Input
                            id="email"
                            dir="ltr"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="mt-1.5 h-11"
                        />
                    </div>
                    <div className="flex gap-2 pt-2">
                        <Button
                            type="submit"
                            className="h-11 bg-gold px-6 text-primary-foreground hover:opacity-90"
                        >
                            ذخیره تغییرات
                        </Button>
                        <Link
                            to="/profile"
                            className="inline-flex h-11 items-center rounded-md border border-border px-4 text-sm font-bold hover:bg-muted"
                        >
                            انصراف
                        </Link>
                    </div>
                </form>
            </section>
        </AppShell>
    );
}
