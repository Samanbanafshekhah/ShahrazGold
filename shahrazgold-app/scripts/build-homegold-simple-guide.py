#!/usr/bin/env python3
"""Build the operator's HomeGold guide. Requires markdown-it-py."""

import base64
from pathlib import Path

from markdown_it import MarkdownIt


ROOT = Path(__file__).resolve().parent.parent
DOCS = ROOT / "docs"


def build() -> None:
    markdown = MarkdownIt("commonmark", {"html": False}).enable("table")
    source = (DOCS / "HOMEGOLD_SIMPLE_GUIDE.fa.md").read_text(encoding="utf-8")
    chapters = source.split("\n## ")[1:]
    pages = []
    diagram = '''<div class="flow" aria-label="مسیر انتقال قیمت">
    <div><b>هوم‌گلد</b><span>قیمت محصول را می‌دهد</span></div>
    <span class="arrow" aria-hidden="true">←</span>
    <div><b>اتصال محصول</b><span>محصول متناظر را شما انتخاب می‌کنید</span></div>
    <span class="arrow" aria-hidden="true">←</span>
    <div><b>شهرازگلد</b><span>قیمت محصول خودکار به‌روز می‌شود</span></div>
    </div>'''
    for number, chapter in enumerate(chapters, 1):
        body = markdown.render("## " + chapter)
        if number == 1:
            body = body.replace("<h3>قیمت چگونه به سایت می‌رسد؟</h3>", diagram + "<h3>قیمت چگونه به سایت می‌رسد؟</h3>")
        pages.append(
            f'<section class="sheet" id="page-{number}">'
            '<header class="page-header"><div class="brand"><span>ش</span>'
            '<b>شهرازگلد</b></div><span>راهنمای سادهٔ اتصال هوم‌گلد</span></header>'
            f'<div class="chapter-label">بخش {number} از {len(chapters)}</div>'
            f'{body}</section>'
        )
    fonts = ""
    for weight, filename in [(400, "Vazir-Regular.woff2"), (700, "Vazir-Bold.woff2")]:
        encoded = base64.b64encode((DOCS / "fonts" / filename).read_bytes()).decode("ascii")
        fonts += (
            f"@font-face{{font-family:Vazir;src:url(data:font/woff2;base64,{encoded}) "
            f"format('woff2');font-style:normal;font-weight:{weight};font-display:block;}}"
        )
    template = r'''<!doctype html>
<html lang="fa" dir="rtl"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>راهنمای سادهٔ اتصال هوم‌گلد و ارتباط محصولات</title>
<style>
__FONTS__
:root{--green:#173e34;--gold:#a67c36;--text:#273d36;--muted:#697870;--line:#e6dfd1}
*{box-sizing:border-box}body{margin:0;background:#ebe8e0;color:var(--text);font:16px/1.9 Vazir,sans-serif}
.toolbar{max-width:880px;margin:22px auto 14px;display:flex;align-items:center;justify-content:space-between;gap:16px;padding:0 15px;font-size:13px;color:var(--muted)}
button{font:inherit;border:0;border-radius:10px;padding:10px 18px;background:var(--green);color:white;cursor:pointer}
.book{max-width:880px;margin:auto}.sheet{background:#fffefa;border:1px solid var(--line);border-radius:20px;padding:30px 44px;margin-bottom:22px;box-shadow:0 14px 35px #173e3408}
.page-header{display:flex;align-items:center;justify-content:space-between;gap:15px;border-bottom:1px solid var(--line);padding-bottom:16px;margin-bottom:22px;color:var(--muted);font-size:12px}
.brand{display:flex;gap:10px;align-items:center;color:var(--green);font-size:19px}.brand span{width:35px;height:35px;display:grid;place-items:center;border-radius:10px;background:var(--green);color:#e8ce90;font-weight:bold}
.chapter-label{font-size:12px;color:var(--gold);font-weight:bold;margin-bottom:7px}
h2{font-size:28px;line-height:1.7;margin:0 0 18px;color:var(--green)}h3{font-size:18px;margin:19px 0 8px;color:#876029}
p{margin:10px 0}strong{font-weight:700;color:var(--green)}ol,ul{padding-inline-start:27px;margin:12px 0}li{padding-inline-start:5px;margin:9px 0}li::marker{color:var(--gold);font-weight:bold}
table{border:1px solid var(--line);border-collapse:separate;border-spacing:0;width:100%;table-layout:fixed;border-radius:12px;overflow:hidden;margin:15px 0;font-size:14px}
th{background:var(--green);color:white;text-align:right;font-weight:bold;padding:11px 13px}td{padding:10px 13px;border-top:1px solid var(--line);vertical-align:top;overflow-wrap:anywhere}tr:nth-child(even) td{background:#f8f5ed}
blockquote{margin:16px 0;padding:10px 16px;background:#f6f0df;border-right:4px solid var(--gold);border-radius:8px;font-size:14px}blockquote p{margin:5px 0}
.flow{display:flex;align-items:center;gap:7px;margin:20px 0}.flow>div{flex:1;min-width:0;border:1px solid #e0d3b6;border-radius:12px;padding:13px 9px;background:#f8f4e9;text-align:center}.flow b{display:block;color:var(--green);font-size:16px}.flow div span{display:block;font-size:11px;color:var(--muted);line-height:1.8;margin-top:4px}.arrow{font-size:23px;color:var(--gold)}
@media(max-width:600px){.sheet{padding:22px 18px;border-radius:12px;margin:12px 9px}body{font-size:15px}h2{font-size:24px}table{font-size:12px}td,th{padding:8px}.flow{gap:4px}.flow div{padding:10px 5px}.flow div span{font-size:10px}.page-header>span{font-size:10px}}
@page{size:A4;margin:15mm 18mm 18mm;@bottom-right{content:"شهرازگلد · راهنمای اتصال هوم‌گلد";font-family:Vazir;font-size:9px;color:#697870}@bottom-left{content:counter(page);font-family:Vazir;font-size:10px;color:#a67c36}}
@media print{body{background:white;font-size:11pt;line-height:1.8;-webkit-print-color-adjust:exact;print-color-adjust:exact}.toolbar{display:none}.book{max-width:none}.sheet{padding:0;border:0;border-radius:0;box-shadow:none;margin:0;break-after:page}.sheet:last-child{break-after:auto}.page-header{margin-bottom:15px;padding-bottom:11px;font-size:9pt}.brand{font-size:15pt}.brand span{width:30px;height:30px}.chapter-label{font-size:9pt}h2{font-size:21pt;margin-bottom:13px;break-after:avoid}h3{font-size:13pt;margin:15px 0 7px;break-after:avoid}p{margin:8px 0;orphans:3;widows:3}li{margin:8px 0;orphans:2;widows:2}table{font-size:10pt;overflow:visible;margin:12px 0}td,th{padding:8px 10px}thead{display:table-header-group}tr{break-inside:avoid}blockquote{font-size:10pt;break-inside:avoid;margin:13px 0;padding:8px 13px}.flow{margin:14px 0;break-inside:avoid}.flow b{font-size:12pt}.flow div span{font-size:8pt}}
</style></head><body>
<div class="toolbar"><span>۶ بخش کوتاه · فونت وزیر · راهنمای کار با پنل</span><button onclick="window.print()">چاپ / ذخیرهٔ PDF</button></div>
<main class="book">__PAGES__</main>
</body></html>'''
    output = template.replace("__FONTS__", fonts).replace("__PAGES__", "".join(pages))
    target = DOCS / "HOMEGOLD_SIMPLE_GUIDE.fa.html"
    target.write_text(output, encoding="utf-8")
    print(f"Created {target.name}: {len(chapters)} focused sections, embedded Vazir")


if __name__ == "__main__":
    build()
