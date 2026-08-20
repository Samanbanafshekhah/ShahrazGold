import { Brand } from "./brand";
import { Instagram, Mail, MapPin, Phone, Send, Twitter } from "lucide-react";
import { toPersianDigits } from "@/lib/formatters";

export function PublicFooter() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto grid max-w-[1440px] gap-10 px-4 py-12 sm:px-6 lg:grid-cols-4">
        <div className="space-y-3">
          <Brand />
          <p className="text-sm leading-7 text-muted-foreground">
            شهراز‌گلد پلتفرمی حرفه‌ای برای مشاهده شفاف قیمت طلا و سکه و مدیریت آسان حساب کاربری،
            طراحی‌شده برای فعالان بازار طلا.
          </p>
          <div className="flex items-center gap-2 pt-1">
            {[Instagram, Twitter, Send].map((Icon, i) => (
              <a
                key={i}
                href="#"
                aria-label="شبکه اجتماعی"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border text-muted-foreground transition hover:border-[color:var(--gold)] hover:text-[color:var(--gold-dark)]"
              >
                <Icon className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-bold">دسترسی سریع</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>
              <a href="/" className="hover:text-foreground">
                صفحه اصلی
              </a>
            </li>
            <li>
              <a href="#features" className="hover:text-foreground">
                خدمات ما
              </a>
            </li>
            <li>
              <a href="#prices" className="hover:text-foreground">
                قیمت‌ها
              </a>
            </li>
            <li>
              <a href="/login" className="hover:text-foreground">
                ورود به حساب
              </a>
            </li>
            <li>
              <a href="/admin-login" className="hover:text-foreground">
                ورود مدیر
              </a>
            </li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-bold">راهنما</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>
              <a href="#" className="hover:text-foreground">
                قوانین و مقررات
              </a>
            </li>
            <li>
              <a href="#" className="hover:text-foreground">
                حریم خصوصی
              </a>
            </li>
            <li>
              <a href="#" className="hover:text-foreground">
                پرسش‌های متداول
              </a>
            </li>
            <li>
              <a href="#" className="hover:text-foreground">
                پشتیبانی
              </a>
            </li>
          </ul>
        </div>
        <div id="contact">
          <h4 className="mb-3 text-sm font-bold">در تماس باشید</h4>
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <Phone className="mt-0.5 h-4 w-4 text-[color:var(--gold-dark)]" />
              <span>{toPersianDigits("021-91009100")}</span>
            </li>
            <li className="flex items-start gap-2">
              <Mail className="mt-0.5 h-4 w-4 text-[color:var(--gold-dark)]" />
              <span>support@shahraygold.ir</span>
            </li>
            <li className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 text-[color:var(--gold-dark)]" />
              <span>تهران، خیابان ولیعصر، برج طلایی، طبقه {toPersianDigits(9)}</span>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="mx-auto flex max-w-[1440px] flex-col items-center justify-between gap-2 px-4 py-4 text-xs text-muted-foreground sm:flex-row sm:px-6">
          <span>
            © {toPersianDigits(new Date().getFullYear())} شهراز‌گلد. تمامی حقوق محفوظ است.
          </span>
          <span>ساخته‌شده با دقت برای بازار طلای ایران</span>
        </div>
      </div>
    </footer>
  );
}
