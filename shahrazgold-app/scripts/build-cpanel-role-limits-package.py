#!/usr/bin/env python3
"""Package role editing and purchase limits with every built SPA dependency.

Run `npm run build:htdocs` with empty VITE_REVERB_* values before this script.
"""

from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile, ZipInfo
import hashlib
import posixpath
import re
import subprocess


root = Path(__file__).resolve().parents[1]
client = root / "frontend/dist/client"
output = root / "dist/shahrazgold-role-and-purchase-limits-cpanel-fixed-2026-10-07.zip"
backend = [
    "app/Http/Controllers/Api/V1/Admin/UserController.php",
    "app/Http/Requests/Admin/UserRequest.php",
    "app/Http/Resources/UserResource.php",
    "app/Models/User.php",
    "app/Services/PurchaseRequestService.php",
    "database/migrations/2026_10_01_000001_add_transaction_limit_rial_to_users_table.php",
    "database/migrations/2026_10_05_000001_add_quantity_purchase_limits_to_users.php",
    "update-role-limits-cpanel.php",
]

assert (client / "index.html").is_file(), "Build the cPanel SPA first."
files = {}
for relative in backend:
    path = root / relative
    subprocess.run(["php", "-l", str(path)], check=True, stdout=subprocess.DEVNULL)
    files["shahrazgold-app/" + relative] = path.read_bytes()

# Bundle the whole compiled frontend so installation does not depend on old chunks.
for path in sorted(client.rglob("*")):
    if path.is_file() and path.name != ".htaccess":
        files["public_html/" + path.relative_to(client).as_posix()] = path.read_bytes()

missing = []
for name, data in files.items():
    if not name.startswith("public_html/") or not name.endswith((".js", ".css", ".html")):
        continue
    references = re.findall(r'''["']([^"'\s]+\.(?:js|css))(?:\?[^"']*)?["']''', data.decode())
    for reference in references:
        if reference.startswith(("http:", "https:", "data:")):
            continue
        # Vite preload maps use assets/... relative to the application root.
        if reference.startswith(("/", "assets/")):
            target = "public_html/" + reference.lstrip("/")
        else:
            target = posixpath.normpath(posixpath.join(posixpath.dirname(name), reference))
        if target not in files:
            missing.append((name, reference))
assert not missing, f"Missing JavaScript/CSS dependencies: {missing}"

files["README-UPDATE.fa.txt"] = """بسته اصلاحی تغییر نقش و حد خرید — 2026-10-07

این بسته جایگزین زیپ کوچک تغییر نقش است و به زیپ‌های قبلی نقش و حد معامله وابسته نیست.
برنامه پایه باید قبلاً روی هاست نصب شده باشد.
کل خروجی آماده رابط کاربری، پنج فایل PHP مرتبط، دو migration و اسکریپت نصب داخل آن است؛ کل پروژه نیست.
vendor، node_modules، سورس فرانت، .env، .htaccess، index.php، storage و اطلاعات مشتریان داخل بسته نیستند.

نصب:
1) ZIP را در Home Directory هاست cPanel (یک پوشه بالاتر از public_html) استخراج کنید.
پوشه‌های shahrazgold-app و public_html با پوشه‌های موجود ادغام شوند و Replace/Overwrite را تأیید کنید.
پوشه‌های فعلی و فایل‌های قدیمی assets را حذف نکنید.
2) migration حد معامله ضروری است. یکی از دو روش زیر را اجرا کنید:

روش Terminal:
cd /home/CPANEL_USERNAME/shahrazgold-app
php update-role-limits-cpanel.php

روش بدون Terminal:
در cPanel > Cron Jobs یک Cron موقت با زمان Every Minute ایجاد کنید:
/usr/local/bin/php /home/CPANEL_USERNAME/shahrazgold-app/update-role-limits-cpanel.php
نام واقعی حساب هاست را به جای CPANEL_USERNAME بگذارید.
اگر مسیر PHP هاست متفاوت است، مسیر PHP نسخه 8.3 یا جدیدتر را استفاده کنید.
فایل shahrazgold-app/storage/logs/cpanel-role-limits-update.log را بررسی کنید.
پس از مشاهده exit=0، Cron موقت را حذف کنید.
اسکریپت کش تنظیمات، مسیرها و قالب‌ها را پاک و فقط دو migration مربوط به حد معامله را اجرا می‌کند.
migrationهای قبلاً اجراشده دوباره اجرا نمی‌شوند.
3) کش CDN/هاست را در صورت استفاده پاک و مرورگر را با Ctrl+F5 تازه‌سازی کنید.

تغییرات:
تغییر نقش در فرم ویرایش کاربر اختیاری است و «بدون تغییر» نقش فعلی را نگه می‌دارد.
دکمه حد معامله، سقف خرید طلا را به گرم و کالاهای تعدادی را به عدد تنظیم می‌کند.
ورودی خالی یعنی نامحدود و صفر یعنی خرید مجاز نیست.
خریدهای در انتظار، تأییدشده و تکمیل‌شده از سقف مصرف می‌کنند.
سقف‌های تومانی قبلی به گرم و عدد تبدیل نمی‌شوند؛ سقف جدید مشتریان را در پنل تنظیم کنید.

بیلد cPanel، وجود تمام وابستگی‌های JavaScript/CSS و syntax فایل‌های PHP بررسی شده است.
FILES.sha256 فهرست و هش فایل‌های بسته است.
""".encode()
files["FILES.sha256"] = "".join(
    hashlib.sha256(data).hexdigest() + "  " + name + "\n"
    for name, data in sorted(files.items())
).encode()

output.parent.mkdir(parents=True, exist_ok=True)
with ZipFile(output, "w", compression=ZIP_DEFLATED, compresslevel=9) as archive:
    for name, data in sorted(files.items()):
        entry = ZipInfo(name)
        entry.compress_type = ZIP_DEFLATED
        mode = 0o100755 if name.endswith("update-role-limits-cpanel.php") else 0o100644
        entry.external_attr = mode << 16
        archive.writestr(entry, data, compresslevel=9)

with ZipFile(output) as archive:
    assert archive.testzip() is None
    assert set(archive.namelist()) == set(files)
    protected = {"vendor", "node_modules", "storage", "tests", ".env", ".htaccess", "frontend"}
    for name, data in files.items():
        assert not protected.intersection(name.split("/"))
        assert archive.read(name) == data

print(output)
print(f"{len(files)} files; {output.stat().st_size:,} bytes; no missing JS/CSS dependencies")
print("SHA256:", hashlib.sha256(output.read_bytes()).hexdigest())
