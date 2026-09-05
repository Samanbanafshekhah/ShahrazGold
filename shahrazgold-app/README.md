# ShahrazGold یکپارچه

این دایرکتوری فرانت TanStack/Vite و بک‌اند Laravel را برای اجرا و انتشار روی یک دامنه ترکیب می‌کند.

## ساختار

- `app/`، `routes/`، `database/`: بک‌اند Laravel و APIهای `/api/v1`
- `frontend/`: سورس فرانت
- `public/`: Document Root مشترک؛ فایل‌های SPA و `index.php` لاراول
- `scripts/build-frontend.sh`: build فرانت و انتقال خروجی به `public`
- `scripts/build-cpanel-package.sh`: تولید ZIP آماده cPanel در `dist/`

فرانت در production از Base URL نسبی `/api/v1` استفاده می‌کند. بنابراین سایت و API روی همان دامنه هستند و هاست دوم یا تنظیم CORS بین دو دامنه لازم نیست.

## پیش‌نیاز توسعه

- PHP 8.3 یا 8.4 و Composer
- Node.js 22.12 یا جدیدتر
- PostgreSQL و Redis، یا Docker Compose

## راه‌اندازی محلی

```bash
cp .env.example .env
composer install
npm --prefix frontend ci
npm run build
php artisan key:generate
docker compose up -d
docker compose exec app php artisan migrate
docker compose exec app php artisan db:seed
```

سایت و API هر دو از `http://localhost:8080` در دسترس‌اند. برای توسعه زنده فرانت، بک‌اند، worker و WebSocket server:

```bash
composer run dev
```

در این حالت Laravel روی `http://127.0.0.1:8090`، Vite روی `http://127.0.0.1:8080` و Reverb روی پورت تنظیم‌شده در `.env` اجرا می‌شوند. Vite درخواست‌های `/api` را به Laravel proxy می‌کند. برای مقصد دیگر، `VITE_API_PROXY_TARGET` را تنظیم کنید.

جزئیات معماری real-time، تنظیم Redis/Reverb و استقرار production در `docs/REALTIME_PRICES.md` است.

## فعال‌سازی پیامک کاوه‌نگار

در پنل کاوه‌نگار یک الگوی اعتبارسنجی بسازید که شامل `%token` باشد؛ برای نمونه:

```text
کد تأیید شهرازگلد: %token
```

پس از تأیید الگو، این مقادیر را در `.env` قرار دهید:

```dotenv
KAVENEGAR_API_KEY=your-api-key
KAVENEGAR_OTP_TEMPLATE=shahrazgoldverify
```

سپس `php artisan config:clear` را اجرا کنید. کلید API فقط در backend استفاده می‌شود و نباید در متغیرهای `VITE_*` یا کد frontend قرار بگیرد.

جریان ثبت‌نام از مسیرهای `POST /api/v1/auth/register`، `POST /api/v1/auth/register/verify` و `POST /api/v1/auth/register/resend` استفاده می‌کند. کد شش‌رقمی پنج دقیقه اعتبار دارد، ارسال مجدد پس از ۹۰ ثانیه ممکن است و پس از پنج تلاش ناموفق باطل می‌شود؛ این مقادیر از متغیرهای نمونه محیط قابل تغییرند.

بازیابی رمز عبور پیامکی از مسیرهای `POST /api/v1/auth/forgot-password`،
`POST /api/v1/auth/forgot-password/resend` و `POST /api/v1/auth/reset-password` استفاده
می‌کند. پس از تغییر رمز، تمام نشست‌های قبلی کاربر باطل می‌شوند.

## بررسی کیفیت

```bash
npm --prefix frontend run build:htdocs
npm --prefix frontend run lint
php artisan test
vendor/bin/pint --test
```

تست‌های Laravel به PostgreSQL آزمایشی و Redis تعریف‌شده در Docker Compose نیاز دارند.

## انتشار روی یک هاست cPanel

```bash
./scripts/build-cpanel-package.sh
```

خروجی `dist/shahrazgold-cpanel.zip` شامل دو پوشه است:

- `shahrazgold-app`: کد خصوصی Laravel، خارج از web root
- `public_html`: SPA، assetها و front controller لاراول روی همان دامنه

راهنمای مرحله‌به‌مرحله در `docs/CPANEL_DEPLOYMENT.fa.md` قرار دارد.
