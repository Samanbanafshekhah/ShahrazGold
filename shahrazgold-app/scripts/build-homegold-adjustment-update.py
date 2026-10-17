#!/usr/bin/env python3
"""Package only HomeGold adjustment PHP files and changed frontend assets.

Build frontend for cPanel first, then pass the previous deployed update ZIP.
Uses only the Python standard library and preserves all existing host settings.
"""

import argparse
from datetime import datetime
import hashlib
import json
import re
import stat
import subprocess
import zipfile
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
PHP_FILES = [
    "app/Http/Controllers/Api/V1/Admin/HomeGoldController.php",
    "app/Http/Requests/Admin/HomeGoldBindingRequest.php",
    "app/Models/HomeGoldBinding.php",
    "app/Services/HomeGoldPricingService.php",
]


def write_host_file(archive, name, data):
    info = zipfile.ZipInfo(name, date_time=datetime.now().timetuple()[:6])
    info.create_system = 3
    info.external_attr = (stat.S_IFREG | 0o644) << 16
    info.compress_type = zipfile.ZIP_DEFLATED
    archive.writestr(info, data, compresslevel=9)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--baseline", type=Path, required=True, help="Previous deployed update ZIP")
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    client = ROOT / "frontend/dist/client"
    if not (client / "index.html").is_file():
        raise SystemExit("Build frontend with npm --prefix frontend run build:htdocs first.")
    files = {f"shahrazgold-app/{name}": (ROOT / name).read_bytes() for name in PHP_FILES}
    files["public_html/index.html"] = (client / "index.html").read_bytes()
    unchanged = 0
    with zipfile.ZipFile(args.baseline) as previous:
        baseline_names = set(previous.namelist())
        if "public_html/index.html" not in baseline_names:
            raise SystemExit("Baseline ZIP must contain the previous frontend release.")
        for path in sorted((client / "assets").rglob("*")):
            if not path.is_file():
                continue
            name = f"public_html/{path.relative_to(client).as_posix()}"
            data = path.read_bytes()
            if name in baseline_names and previous.read(name) == data:
                unchanged += 1
            else:
                files[name] = data

        # Every asset referenced by the new build must exist after the overlay.
        pattern = re.compile(r'''["']((?:\./|/?assets/)[^"'\s]+\.(?:js|css|woff2?))["']''')
        for path in [client / "index.html", *sorted((client / "assets").glob("*.js")), *sorted((client / "assets").glob("*.css"))]:
            for reference in pattern.findall(path.read_text(encoding="utf-8")):
                relative = (
                    (path.parent.relative_to(client) / reference[2:]).as_posix()
                    if reference.startswith("./") else reference.lstrip("/")
                )
                name = f"public_html/{relative}"
                if not (client / relative).is_file() or (name not in files and name not in baseline_names):
                    raise SystemExit(f"Missing frontend dependency: {reference} in {path.name}")

    for name in files:
        parts = Path(name).parts
        if any(part in {"vendor", "storage", "node_modules", ".git", "bootstrap"} or part.startswith(".env") for part in parts):
            raise SystemExit(f"Protected host path in update: {name}")
        if name.endswith(("index.php", ".htaccess")):
            raise SystemExit(f"Protected host file in update: {name}")

    revision = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip()
    manifest = {
        "update": "homegold-buy-sell-adjustments",
        "source_commit": revision,
        "baseline_package": args.baseline.name,
        "baseline_sha256": hashlib.sha256(args.baseline.read_bytes()).hexdigest(),
        "database_migration_required": False,
        "unchanged_frontend_assets_omitted": unchanged,
        "files": {name: {"sha256": hashlib.sha256(data).hexdigest(), "bytes": len(data)} for name, data in sorted(files.items())},
    }
    readme = """آپدیت محدود تنظیم قیمت خرید و فروش هوم‌گلد

این ZIP برای سایت فعالی است که بخش هوم‌گلد و آپدیت قبلی را دارد.
فقط چهار فایل PHP این قابلیت، index.html فرانت و فایل‌های جدید یا تغییرکردهٔ assets در بسته‌اند.
فایل‌های مشترکِ بدون تغییرِ بستهٔ قبلی، دوباره در ZIP قرار نگرفته‌اند.
نام بستهٔ مبنا و فهرست دقیق فایل‌ها در UPDATE-MANIFEST.json آمده است.

روش نصب:
۱. از چهار فایل PHP نوشته‌شده در FILES.txt و public_html/index.html نسخهٔ پشتیبان بگیرید.
۲. ZIP را در Home حساب هاست، کنار پوشه‌های shahrazgold-app و public_html، Extract کنید.
۳. جایگزینی فایل‌های هم‌نام را تأیید کنید. داخل public_html به‌تنهایی Extract نکنید.
۴. اگر Terminal دارید، از پوشهٔ shahrazgold-app با PHP صحیح هاست اجرا کنید:
   php artisan optimize:clear
۵. مرورگر را با Ctrl+F5 تازه کنید و از منوی اتصال هوم‌گلد وارد شوید.

این تغییر به migration یا composer install نیاز ندارد. فایل‌های .env، .htaccess،
public_html/index.php، vendor، storage، فایل‌های آپلودشده و اطلاعات کاربران داخل ZIP نیستند.
فایل‌های assets قدیمی را حذف نکنید؛ بخشی از آن‌ها در نسخهٔ جدید هم استفاده می‌شوند.
کار جدیدی در Cron لازم نیست؛ زمان‌بندی موجود هوم‌گلد را حفظ کنید.

آزمون بعد از نصب:
یک محصول را انتخاب کنید. برای خرید و فروش جداگانه افزایش یا کاهش را بزنید.
مبلغ به تومان است؛ مثلاً 10,000,000 یعنی ده میلیون تومان.
پیش‌نمایش را بررسی و سپس تنظیمات را ذخیره کنید. اختلاف تنظیم‌شده روی دریافت‌های بعدی هم اعمال می‌شود.

برای بازگشت، فایل‌های PHP و index.html پشتیبان را برگردانید؛ حذف assets جدید لازم نیست.
"""
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(args.output, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for name, data in sorted(files.items()):
            write_host_file(archive, name, data)
        write_host_file(archive, "README-UPDATE.fa.txt", readme)
        write_host_file(archive, "FILES.txt", "\n".join(sorted(files)) + "\n")
        write_host_file(archive, "UPDATE-MANIFEST.json", json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
    with zipfile.ZipFile(args.output) as archive:
        if archive.testzip() is not None:
            raise SystemExit("ZIP integrity check failed.")
        for name, data in files.items():
            if archive.read(name) != data:
                raise SystemExit(f"ZIP content mismatch: {name}")
        for info in archive.infolist():
            if stat.S_IMODE(info.external_attr >> 16) != 0o644:
                raise SystemExit(f"Incorrect file permissions: {info.filename}")
    print(f"Created {args.output.name}: {len(PHP_FILES)} PHP files, {len(files) - len(PHP_FILES) - 1} changed frontend assets, index.html")
    print(f"Omitted {unchanged} unchanged assets; ZIP and 0644 permissions verified; {args.output.stat().st_size:,} bytes")


if __name__ == "__main__":
    main()
