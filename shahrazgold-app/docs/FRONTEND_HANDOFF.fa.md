# سند تحویل API به تیم فرانت‌اند ShahrazGold

این سند قرارداد اتصال فرانت‌اند به Backend نسخه `v1` را خلاصه می‌کند. جزئیات بیشتر و نمونه‌های کامل در `docs/API.md` و Postman Collection موجود است.

## 1. آدرس و تنظیمات اولیه

در محیط توسعه:

```env
VITE_API_BASE_URL=http://localhost:8080/api/v1
```

در Production مقدار متغیر بالا باید با دامنه واقعی API جایگزین شود. تمام درخواست‌ها و پاسخ‌ها JSON هستند، به‌جز Endpointهایی که تصویر می‌پذیرند و باید با `multipart/form-data` ارسال شوند.

Headerهای پیشنهادی:

```http
Accept: application/json
Content-Type: application/json
Authorization: Bearer <access_token>
```

Header آخر فقط برای Routeهای احراز هویت‌شده لازم است.

## 2. قرارداد عمومی پاسخ

پاسخ موفق:

```json
{
  "success": true,
  "message": "OK",
  "data": {},
  "meta": {}
}
```

پاسخ Validation:

```json
{
  "success": false,
  "message": "Validation failed.",
  "data": null,
  "errors": {
    "mobile": [
      "The mobile field format is invalid."
    ]
  }
}
```

لیست‌های صفحه‌بندی‌شده آرایه رکوردها را در `data` و اطلاعات Pagination را در `meta` برمی‌گردانند:

```json
{
  "success": true,
  "message": "OK",
  "data": [],
  "meta": {
    "current_page": 1,
    "per_page": 15,
    "last_page": 1,
    "total": 0
  }
}
```

رفتار پیشنهادی بر اساس Status Code:

- `401`: پاک‌کردن نشست محلی و انتقال به Login.
- `403`: نمایش پیام نداشتن مجوز.
- `404`: نمایش Not Found.
- `409`: نمایش Conflict؛ برای `PRICE_CHANGED` جریان ویژه بخش معامله اجرا شود.
- `422`: خطاهای `errors` کنار فیلدهای فرم نمایش داده شوند.
- `429`: نمایش پیام محدودیت درخواست و جلوگیری موقت از ارسال مجدد.

## 3. قواعد داده

- تمام مبلغ‌ها ریال هستند و نامشان به `_rial` ختم می‌شود.
- مبلغ‌ها را به‌صورت `string` نگه دارید؛ آن‌ها را به JavaScript `number` تبدیل نکنید.
- درصد و Quantity اعشاری نیز `string` هستند.
- تاریخ‌ها ISO 8601 و UTC هستند. تبدیل و نمایش شمسی فقط در فرانت انجام شود.
- موبایل ایران با الگوی `09xxxxxxxxx` ارسال شود.
- واحدها: `gram`، `mithqal` و `count`.
- نوع قیمت‌گذاری: `manual` یا `derived`.
- نوع معامله: `customer_buy` یا `customer_sell`.
- روش ورود معامله: `quantity` یا `amount`.
- وضعیت درخواست: `pending`، `approved`، `rejected`، `cancelled` و `completed`.
- وضعیت اطلاعیه: `draft` یا `published`.

برای `gram` و `mithqal` حداکثر ۶ رقم اعشار قابل ارسال است. محصول دارای واحد `count` فقط Quantity صحیح مثبت می‌پذیرد.

## 4. احراز هویت

Routeها:

```text
POST /auth/register
POST /auth/login
POST /auth/logout
POST /auth/logout-all
GET  /auth/me
PUT  /auth/profile
PUT  /auth/password
```

Login:

```json
{
  "mobile": "09123456789",
  "password": "secret123",
  "device_name": "web"
}
```

پاسخ Login شامل `data.access_token` و `data.user` است. Token را در تمام درخواست‌های محافظت‌شده به‌صورت Bearer ارسال کنید. نقش قابل اعتماد کاربر فقط مقدار `data.user.role` دریافتی از سرور است.

ثبت‌نام عمومی همیشه کاربر `customer` ایجاد می‌کند؛ هیچ فیلد `role` از فرم ثبت‌نام ارسال نشود.

## 5. کاتالوگ عمومی

```text
GET /categories
GET /products
GET /products/{slug}
GET /market/prices
GET /announcements/current
```

فیلترهای `GET /products`:

```text
category=<category-slug>
search=<name-or-symbol>
per_page=20
page=1
```

قیمت عمومی محصول فقط در این مسیر خوانده شود:

```text
data.current_price.raw_price_rial
```

اگر قیمت موجود نباشد:

```json
{
  "current_price": null,
  "is_price_available": false
}
```

در صفحه عمومی هیچ قیمت خرید یا فروش محاسبه نشود. قیمت تعدیل‌شده فقط از Preview دریافت می‌شود.

## 6. جریان صحیح خرید و فروش

### مرحله اول: Preview

```text
POST /trade/preview
```

خرید بر اساس وزن:

```json
{
  "product_id": 1,
  "trade_type": "customer_buy",
  "entry_mode": "quantity",
  "quantity": "1.250000"
}
```

خرید بر اساس مبلغ:

```json
{
  "product_id": 1,
  "trade_type": "customer_buy",
  "entry_mode": "amount",
  "amount_rial": "200000000"
}
```

فقط یکی از `quantity` و `amount_rial` ارسال شود. قیمت، درصد تعدیل، مبلغ نهایی و User ID نباید از فرانت ارسال شوند.

فیلدهای مهم پاسخ Preview:

```json
{
  "product_price_id": 25,
  "raw_unit_price_rial": "69255275",
  "adjustment_percent": "1.0000",
  "adjustment_amount_rial": "692553",
  "final_unit_price_rial": "69947828",
  "quantity": "1.25",
  "total_amount_rial": "87434785",
  "price_effective_at": "2026-07-25T08:10:00+00:00"
}
```

### مرحله دوم: ثبت درخواست

```text
POST /purchase-requests
```

Payload باید ورودی اصلی Preview را همراه شناسه قیمت و UUID جدید داشته باشد:

```json
{
  "client_reference": "50e75b94-58e3-4f44-8961-4e9f7e54f189",
  "expected_product_price_id": 25,
  "product_id": 1,
  "trade_type": "customer_buy",
  "entry_mode": "quantity",
  "quantity": "1.250000",
  "user_note": "لطفاً بررسی شود"
}
```

برای Retry همان عملیات، همان `client_reference` را نگه دارید. برای معامله جدید UUID تازه بسازید. این فیلد از ثبت تکراری در دوبار کلیک جلوگیری می‌کند.

### مدیریت `PRICE_CHANGED`

اگر قیمت بین Preview و ثبت تغییر کند، سرور `409` برمی‌گرداند:

```json
{
  "success": false,
  "message": "PRICE_CHANGED",
  "data": {
    "preview": {
      "product_price_id": 26,
      "raw_unit_price_rial": "70000000",
      "final_unit_price_rial": "70700000",
      "quantity": "1.25",
      "total_amount_rial": "88375000"
    }
  },
  "errors": null
}
```

در این حالت:

1. Preview جدید `data.preview` را به کاربر نمایش دهید.
2. اختلاف قیمت و مبلغ را مشخص کنید.
3. بعد از تأیید مجدد کاربر، همان ورودی معامله را با `expected_product_price_id` جدید ارسال کنید.
4. قیمت Preview قبلی را در State نهایی معتبر فرض نکنید.

## 7. درخواست‌های کاربر

```text
GET  /purchase-requests?page=1&per_page=15
POST /purchase-requests
GET  /purchase-requests/{id}
POST /purchase-requests/{id}/cancel
```

لغو فقط برای درخواست `pending` متعلق به همان کاربر ممکن است.

## 8. پنل مدیر

تمام Routeهای این بخش به Token کاربر `admin` نیاز دارند.

فیلتر کاربران:

```text
GET /admin/users?search=&role=admin|customer&is_active=true|false&sort=newest|oldest&page=1&per_page=15
```

فیلتر محصولات:

```text
GET /admin/products?search=&category_id=&is_active=&is_buyable=&is_sellable=&pricing_mode=manual|derived&sort=newest|oldest&page=1&per_page=15
```

فیلتر درخواست‌ها:

```text
GET /admin/purchase-requests
    ?request_number=
    &user_id=
    &mobile=
    &product_id=
    &trade_type=customer_buy|customer_sell
    &status=pending|approved|rejected|cancelled|completed
    &date_from=2026-07-01
    &date_to=2026-07-31
    &min_amount_rial=
    &max_amount_rial=
    &sort=newest|oldest
    &page=1
    &per_page=15
```

Transitionهای مجاز:

```text
pending  -> approved
pending  -> rejected
pending  -> cancelled
approved -> completed
```

Endpointهای مدیر:

```text
GET|POST       /admin/users
GET|PUT|DELETE /admin/users/{id}
PATCH          /admin/users/{id}/status

GET|POST       /admin/categories
GET|PUT|DELETE /admin/categories/{id}

GET|POST       /admin/products
GET|PUT|DELETE /admin/products/{id}

GET  /admin/price-sources
GET  /admin/price-sources/{id}/quotes
GET  /admin/price-sources/{id}/quotes/current
POST /admin/price-sources/{id}/quotes

GET  /admin/products/{id}/prices
GET  /admin/products/{id}/prices/current
POST /admin/products/{id}/prices

GET  /admin/purchase-requests
GET  /admin/purchase-requests/{id}
POST /admin/purchase-requests/{id}/approve
POST /admin/purchase-requests/{id}/reject
POST /admin/purchase-requests/{id}/complete

GET|POST       /admin/announcements
GET|PUT|DELETE /admin/announcements/{id}
POST           /admin/announcements/{id}/publish
POST           /admin/announcements/{id}/unpublish

GET /admin/dashboard
GET /admin/presence
GET /admin/presence/count
GET /admin/audit-logs
GET /admin/reports/purchase-requests
GET /admin/reports/price-history
```

ثبت قیمت مستقیم فقط برای محصول `manual` مجاز است. برای محصول `derived` باید مظنه منبع ثبت شود.

تصویر دسته‌بندی و محصول با کلید `image` و `multipart/form-data` ارسال شود.

## 9. Presence

بعد از ورود کاربر، هر ۳۰ ثانیه درخواست زیر ارسال شود:

```text
POST /presence/heartbeat
```

TTL سرور حدود ۹۰ ثانیه است. Token یا اطلاعات Session در Payload ارسال نمی‌شود.

## 10. چک‌لیست اتصال

- Base URL از Environment خوانده شود.
- Bearer Token فقط به Routeهای محافظت‌شده اضافه شود.
- Role و وضعیت کاربر از `/auth/me` همگام شود.
- مبلغ‌ها و Quantity به‌صورت String باقی بمانند.
- قیمت عمومی با `raw_price_rial` نمایش داده شود.
- قبل از ثبت درخواست همیشه Preview گرفته شود.
- `expected_product_price_id` و `client_reference` ارسال شوند.
- `409 PRICE_CHANGED` با تأیید مجدد کاربر مدیریت شود.
- Heartbeat هر ۳۰ ثانیه فعال باشد.
- تاریخ‌ها در UI به شمسی تبدیل شوند، ولی مقدار اصلی UTC حفظ شود.
- روی Logout، Token محلی پاک شود.
- فرم‌ها خطاهای `422.errors` را در سطح فیلد نمایش دهند.

## 11. منابع آماده

- مستندات کامل: `docs/API.md`
- Postman Collection: `docs/ShahrazGold.postman_collection.json`
- فهرست Routeهای Backend: `php artisan route:list`

