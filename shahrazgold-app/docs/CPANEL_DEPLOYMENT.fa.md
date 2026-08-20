# انتشار تک‌هاستی ShahrazGold روی cPanel

این بسته فرانت و API را روی یک دامنه منتشر می‌کند. نیازی به زیردامنه API یا خرید هاست دوم نیست.

## ساخت بسته

روی سیستم توسعه، در ریشه پروژه اجرا کنید:

```bash
./scripts/build-cpanel-package.sh
```

فایل `dist/shahrazgold-cpanel.zip` ساخته می‌شود. برای build فرانت، Node.js 22.12 یا جدیدتر پیشنهاد می‌شود.

## ساختار امن روی هاست

ZIP را در Home Directory حساب cPanel استخراج کنید:

```text
/home/CPANEL_USERNAME/shahrazgold-app
/home/CPANEL_USERNAME/public_html
```

`shahrazgold-app` حاوی کد خصوصی، `.env` و `vendor` است و نباید داخل `public_html` قرار بگیرد. `public_html` فقط SPA، assetها، storage عمومی و `index.php` را نگه می‌دارد.

اگر `public_html` از قبل فایل دارد، قبل از Extract نسخه پشتیبان بگیرید.

## پیش‌نیاز cPanel

در MultiPHP Manager نسخه PHP 8.3 یا 8.4 را برای دامنه اصلی انتخاب کنید. extensionهای زیر باید فعال باشند:

`bcmath`, `ctype`, `curl`, `dom`, `fileinfo`, `intl`, `mbstring`, `openssl`, `pdo_mysql`, `tokenizer`, `xml`, `zip`

برای دامنه اصلی SSL/AutoSSL را فعال و Force HTTPS Redirect را روشن کنید.

## دیتابیس

در MySQL Database Wizard یک دیتابیس و کاربر اختصاصی بسازید، کاربر را با ALL PRIVILEGES به دیتابیس متصل کنید و نام کامل prefixed و رمز را نگه دارید.

## تنظیم env

فایل `/home/CPANEL_USERNAME/shahrazgold-app/.env` یک APP_KEY یکتا دارد. این مقادیر را اصلاح کنید:

```dotenv
APP_URL=https://example.com

DB_DATABASE=CPANEL_USERNAME_shahrazgold
DB_USERNAME=CPANEL_USERNAME_shahrazgold
DB_PASSWORD=رمز_واقعی_دیتابیس

PUBLIC_STORAGE_PATH=/home/CPANEL_USERNAME/public_html/storage
CORS_ALLOWED_ORIGINS=https://example.com,https://www.example.com
```

`APP_ENV=production`، `APP_DEBUG=false`، `CACHE_STORE=file`، `SESSION_DRIVER=file` و `QUEUE_CONNECTION=sync` را حفظ کنید. چون فرانت و API هم‌دامنه‌اند، Base URL فرانت همان `/api/v1` است.

## ساخت مدیر اولیه

فایل زیر را کپی کنید:

```text
/home/CPANEL_USERNAME/shahrazgold-app/storage/app/deployment-admin.json.example
```

نام کپی را `deployment-admin.json` بگذارید و اطلاعات واقعی وارد کنید:

```json
{
  "first_name": "نام مدیر",
  "last_name": "نام خانوادگی",
  "mobile": "09123456789",
  "email": null,
  "password": "یک-رمز-طولانی-و-تصادفی"
}
```

پس از نصب موفق، فایل دارای رمز خام خودکار حذف می‌شود.

## اجرای نصب یک‌باره

در Cron Jobs یک job دقیقه‌ای موقت با این command بسازید:

```bash
/home/CPANEL_USERNAME/shahrazgold-app/deploy-cpanel.php
```

پس از یک تا دو دقیقه، فایل زیر را بررسی کنید:

```text
/home/CPANEL_USERNAME/shahrazgold-app/storage/logs/cpanel-deploy.log
```

در اجرای موفق `exit=0` و پیام تکمیل deployment دیده می‌شود. همان لحظه Cron موقت را حذف کنید.

## آزمایش نهایی

این آدرس‌ها باید روی همان دامنه پاسخ دهند:

```text
https://example.com/
https://example.com/login
https://example.com/admin-login
https://example.com/up
https://example.com/api/v1/categories
https://example.com/api/v1/market/prices
```

ورود مدیر از `/admin-login` با شماره موبایل و رمز ساخته‌شده انجام می‌شود. توکن Sanctum در مرورگر نگه‌داری و در درخواست‌های API با Bearer ارسال می‌شود.

## نگهداری

- از `shahrazgold-app` و دیتابیس backup زمان‌بندی‌شده بگیرید.
- logها در `shahrazgold-app/storage/logs/laravel.log` هستند.
- فقط `storage` و `bootstrap/cache` باید قابل نوشتن باشند؛ از permission 777 استفاده نکنید.
- برای انتشار نسخه جدید، ZIP تازه بسازید و قبل از جایگزینی فایل‌ها backup بگیرید.
