# ShahrazGold API v1

Base URL: `http://localhost:8080/api/v1`. همه زمان‌ها ISO 8601/UTC، همه مبالغ ریال با پسوند `_rial` و نوع JSON string هستند.

## Routeها

احراز هویت: `POST auth/register`, `POST auth/login`, `POST auth/logout`, `POST auth/logout-all`, `GET auth/me`, `PUT auth/profile`, `PUT auth/password`.

عمومی: `GET categories`, `GET products`, `GET products/{slug}`, `GET market/prices`, `GET announcements/current`.

کاربر: `POST trade/preview`, `GET|POST purchase-requests`, `GET purchase-requests/{id}`, `POST purchase-requests/{id}/cancel`, `POST presence/heartbeat`.

مدیر:

- CRUD: `admin/users`, `admin/categories`, `admin/products`, `admin/announcements`
- وضعیت کاربر: `PATCH admin/users/{id}/status`
- مظنه: `GET admin/price-sources`, `GET admin/price-sources/{id}/quotes`, `GET .../quotes/current`, `POST .../quotes`
- قیمت محصول: `GET admin/products/{id}/prices`, `GET .../prices/current`, `POST .../prices`
- درخواست‌ها: `GET admin/purchase-requests`, `GET .../{id}`, `POST .../{id}/approve|reject|complete`
- اطلاعیه: `POST admin/announcements/{id}/publish|unpublish`
- عملیات: `GET admin/presence`, `GET admin/presence/count`, `GET admin/audit-logs`, `GET admin/reports/purchase-requests`, `GET admin/reports/price-history`, `GET admin/dashboard`

لیست‌های مدیر pagination و فیلترهای شرح‌داده‌شده در نام queryها را می‌پذیرند؛ `per_page` حداکثر ۱۰۰ است.

## نمونه احراز هویت

Register:

```json
{"first_name":"علی","last_name":"احمدی","mobile":"09123456789","email":"ali@example.com","password":"secret123","password_confirmation":"secret123"}
```

Login:

```json
{"mobile":"09123456789","password":"secret123","device_name":"web"}
```

پاسخ:

```json
{"success":true,"message":"Logged in.","data":{"user":{"id":12,"first_name":"علی","last_name":"احمدی","mobile":"09123456789","role":"customer","is_active":true},"access_token":"1|...","token_type":"Bearer"},"meta":{}}
```

## دسته‌بندی و محصول

ایجاد دسته:

```json
{"title":"طلا","slug":"gold","description":"محصولات طلا","display_order":0,"is_active":true}
```

ایجاد محصول Derived:

```json
{"product_category_id":1,"name":"طلای ۱۸ عیار","slug":"gold-18","symbol":"GOLD18","unit":"gram","pricing_mode":"derived","price_source_id":1,"pricing_formula_key":"gold18_from_mesghal","is_active":true,"is_buyable":true,"is_sellable":true,"display_order":0,"trade_adjustment_enabled":true,"trade_adjustment_percent":"1.00"}
```

ثبت مظنه (`POST admin/price-sources/1/quotes`):

```json
{"price_rial":"300000000","note":"مظنه لحظه‌ای"}
```

خروجی عمومی طلای ۱۸ عیار (قیمت تعدیل‌نشده):

```json
{"success":true,"message":"OK","data":{"id":1,"name":"طلای ۱۸ عیار","slug":"gold-18","symbol":"GOLD18","unit":"gram","pricing_mode":"derived","category":{"id":1,"title":"طلا","slug":"gold"},"current_price":{"id":25,"raw_price_rial":"69255275","effective_at":"2026-07-25T08:10:00+00:00"},"is_price_available":true,"is_buyable":true,"is_sellable":true},"meta":{}}
```

## Preview معامله

خرید با وزن:

```json
{"product_id":1,"trade_type":"customer_buy","entry_mode":"quantity","quantity":"1.250000"}
```

خرید با مبلغ:

```json
{"product_id":1,"trade_type":"customer_buy","entry_mode":"amount","amount_rial":"200000000"}
```

فروش:

```json
{"product_id":1,"trade_type":"customer_sell","entry_mode":"quantity","quantity":"0.500000"}
```

پاسخ Preview:

```json
{"success":true,"message":"Preview calculated.","data":{"product_price_id":25,"product":{"id":1,"name":"طلای ۱۸ عیار","symbol":"GOLD18","unit":"gram"},"trade_type":"customer_buy","entry_mode":"quantity","raw_unit_price_rial":"69255275","adjustment_percent":"1.0000","adjustment_amount_rial":"692553","final_unit_price_rial":"69947828","quantity":"1.25","total_amount_rial":"87434785","price_effective_at":"2026-07-25T08:10:00+00:00"},"meta":{}}
```

## ثبت و مدیریت درخواست

`client_reference` برای retry همان عملیات ثابت و برای عملیات جدید UUID تازه باشد:

```json
{"client_reference":"50e75b94-58e3-4f44-8961-4e9f7e54f189","expected_product_price_id":25,"product_id":1,"trade_type":"customer_buy","entry_mode":"quantity","quantity":"1.250000","user_note":"لطفاً بررسی شود"}
```

قیمت، درصد، `user_id`، status یا مبلغ نهایی ورودی نیستند. پاسخ شامل Snapshot کامل و `request_number` است.

اگر قیمت عوض شده باشد:

```json
{"success":false,"message":"PRICE_CHANGED","data":{"preview":{"product_price_id":26,"raw_unit_price_rial":"70000000","adjustment_percent":"1.0000","adjustment_amount_rial":"700000","final_unit_price_rial":"70700000","quantity":"1.25","total_amount_rial":"88375000","price_effective_at":"2026-07-25T08:12:00+00:00","product":{"id":1,"name":"طلای ۱۸ عیار","symbol":"GOLD18","unit":"gram"},"trade_type":"customer_buy","entry_mode":"quantity"}},"errors":null}
```

تأیید یا رد مدیر:

```json
{"note":"مدارک و قیمت بررسی شد"}
```

به `POST admin/purchase-requests/42/approve` یا `POST .../reject` ارسال شود. transitionها فقط `pending→approved|rejected|cancelled` و `approved→completed` هستند؛ transition نامعتبر `409` است.

## داشبورد مدیر

`GET admin/dashboard?date_from=2026-07-01&date_to=2026-07-31`

```json
{"success":true,"message":"OK","data":{"total_users":120,"active_users":117,"online_users":8,"pending_requests":4,"today_requests":12,"approved_requests":7,"rejected_requests":2,"completed_requests":30,"completed_buy_total_rial":"15000000000","completed_sell_total_rial":"9200000000","latest_requests":[],"latest_prices":[],"active_announcement":{"id":3,"title":"بازار","body":"بازار فعال است"}},"meta":{}}
```

## نکات اتصال فرانت

- هیچ قیمت/درصدی از state فرانت برای ثبت نهایی معتبر نیست؛ همیشه Preview تازه بگیرید.
- مقدار `current_price.raw_price_rial` را به‌عنوان قیمت عمومی نشان دهید، نه قیمت خرید/فروش Preview.
- `count` فقط Quantity صحیح و `gram/mithqal` تا ۶ رقم اعشار دارند.
- heartbeat هر ۳۰ ثانیه ارسال شود؛ TTL سرور ۹۰ ثانیه است.
- تاریخ شمسی فقط در فرانت تبدیل شود.
- روی `401` ورود مجدد، روی `403` نمایش نداشتن مجوز، روی `409 PRICE_CHANGED` نمایش Preview تازه و تأیید مجدد، و روی `422` نمایش `errors` انجام شود.
