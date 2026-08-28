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
