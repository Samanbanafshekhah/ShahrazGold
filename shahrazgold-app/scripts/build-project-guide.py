#!/usr/bin/env python3
"""Render the Persian project guide with embedded Vazir fonts.

Requires markdown-it-py. Run from any working directory.
"""

import base64
import html
import re
from pathlib import Path

from markdown_it import MarkdownIt


ROOT = Path(__file__).resolve().parent.parent
DOCS = ROOT / "docs"


def build() -> None:
    markdown = MarkdownIt("commonmark", {"html": False}).enable("table")
    source = (DOCS / "PROJECT_GUIDE.fa.md").read_text(encoding="utf-8")
    tokens = markdown.parse(source)
    chapters = []
    for index, token in enumerate(tokens):
        if token.type == "heading_open" and token.tag == "h2":
            anchor = f"chapter-{len(chapters) + 1:02}"
            token.attrSet("id", anchor)
            chapters.append((anchor, tokens[index + 1].content))
    rendered = markdown.renderer.render(tokens, markdown.options, {})
    fragments = re.split(r'(?=<h2 id="chapter-)', rendered)
    content = "".join(f'<section class="chapter">{part}</section>' for part in fragments[1:])
    contents = "".join(
        f'<a href="#{anchor}"><span>{number:02}</span>{html.escape(title)}</a>'
        for number, (anchor, title) in enumerate(chapters, 1)
    )
    font_faces = ""
    for weight, filename in [(400, "Vazir-Regular.woff2"), (700, "Vazir-Bold.woff2")]:
        encoded = base64.b64encode((DOCS / "fonts" / filename).read_bytes()).decode("ascii")
        font_faces += (
            f"@font-face{{font-family:Vazir;src:url(data:font/woff2;base64,{encoded}) "
            f"format('woff2');font-style:normal;font-weight:{weight};font-display:block;}}"
        )
    template = r'''<!doctype html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="راهنمای جامع فارسی شهرازگلد؛ بهره‌برداری، اتصال هوم‌گلد، توسعه و استقرار">
<title>راهنمای جامع شهرازگلد</title>
<style>
__FONTS__
:root{--ink:#20322e;--muted:#687873;--gold:#a67c36;--line:#e6dfd1;--paper:#fffefa;--soft:#f7f3e9;--green:#173e34}
*{box-sizing:border-box}html{scroll-behavior:smooth;scroll-padding-top:32px}
body{margin:0;background:#eeeae2;color:var(--ink);font:15px/1.95 Vazir,sans-serif}
a{color:#896121;text-decoration:none}a:hover{text-decoration:underline}
button{font:inherit;cursor:pointer}.layout{max-width:1440px;margin:auto;display:grid;grid-template-columns:250px minmax(0,1fr);gap:28px;padding:28px}
.sidebar{position:sticky;top:28px;align-self:start;max-height:calc(100vh - 56px);overflow-y:auto;padding:20px 15px;border:1px solid var(--line);border-radius:20px;background:var(--paper)}
.sidebar strong{font-size:20px;display:block;padding:0 8px;color:var(--green)}.sidebar small{display:block;padding:3px 8px 16px;color:var(--muted)}
nav a,.contents a{display:flex;align-items:baseline;gap:10px;padding:8px;border-radius:8px;color:var(--ink);font-size:12px}
nav a:hover,.contents a:hover{background:var(--soft);text-decoration:none}nav span,.contents span{font-family:Vazir,sans-serif;color:var(--gold);font-weight:bold;direction:ltr}
.print-button{width:100%;border:0;border-radius:10px;margin-top:16px;padding:10px;color:#fff;background:var(--green)}
main{min-width:0}.cover,.contents,.chapter{background:var(--paper);border:1px solid var(--line);border-radius:22px;padding:42px 48px;margin-bottom:24px;box-shadow:0 14px 34px #173e3406}
.cover{position:relative;isolation:isolate;overflow:hidden;min-height:650px;display:flex;flex-direction:column;justify-content:space-between;background:linear-gradient(140deg,#fffefa 20%,#f8f1df 100%)}
.cover:after{content:"";width:310px;height:310px;position:absolute;left:-140px;top:180px;border:1px solid #a67c3625;transform:rotate(45deg);box-shadow:0 0 0 32px #a67c3608,0 0 0 64px #a67c3605;z-index:-1}
.brand{display:flex;align-items:center;gap:14px}.brandmark{display:grid;place-items:center;background:var(--green);color:#e8ce90;width:52px;height:52px;border-radius:14px;font:bold 23px Vazir,sans-serif}
.brand b{font-size:23px}.brand small{display:block;font-size:11px;color:var(--muted);letter-spacing:2px;direction:ltr;text-align:right}
.eyebrow{color:var(--gold);font-size:12px;font-weight:bold;letter-spacing:.3px;margin-bottom:15px}
h1{font-size:48px;line-height:1.55;letter-spacing:-1px;margin:0 0 18px;max-width:600px;color:var(--green)}
.cover .summary{font-size:18px;max-width:530px;color:#51635b;margin:0}.cover-rule{width:70px;height:4px;background:var(--gold);margin:25px 0;border-radius:4px}
.tags{display:flex;flex-wrap:wrap;gap:9px;margin-top:28px}.tags span{border:1px solid #a67c3629;padding:5px 14px;border-radius:30px;font-size:12px;color:#7d602e;background:#fffefa90}
.cover-meta{border-top:1px solid #a67c3630;padding-top:22px;display:flex;justify-content:space-between;gap:16px;font-size:12px;color:var(--muted)}
.cover-meta b{display:block;color:var(--green);font-size:14px}.contents h2{font-size:27px;margin:0 0 12px}.contents-grid{display:grid;grid-template-columns:1fr 1fr;gap:2px 20px}.contents a{font-size:14px;padding:10px 0;border-bottom:1px solid #eee7da}
.contents p{font-size:13px;color:var(--muted)}.chapter{counter-increment:chapters}h2{font-size:25px;line-height:1.65;color:var(--green);border-bottom:2px solid var(--line);padding-bottom:14px;margin:0 0 24px}
.chapter h2:before{content:"SHAHRAZGOLD / PROJECT GUIDE";display:block;font:10px/2 Vazir,sans-serif;letter-spacing:1.2px;color:var(--gold);direction:ltr;text-align:right;margin-bottom:6px}
h3{font-size:18px;color:#896121;margin:27px 0 10px}p{margin:12px 0}ul,ol{padding-inline-start:25px}li{padding-inline-start:5px;margin:6px 0}
table{width:100%;border-collapse:separate;border-spacing:0;margin:20px 0;border:1px solid var(--line);border-radius:12px;overflow:hidden;font-size:13px;table-layout:fixed}
th{background:var(--green);color:#fffefa;text-align:right;padding:11px 14px;font-weight:bold}td{padding:10px 14px;vertical-align:top;border-top:1px solid var(--line);overflow-wrap:anywhere}tr:nth-child(even) td{background:#faf7ef}
td:first-child{font-weight:bold}pre{direction:ltr;text-align:left;unicode-bidi:plaintext;white-space:pre-wrap;overflow-wrap:anywhere;background:#f2f5f3;border:1px solid #dce5df;border-right:4px solid #789486;border-radius:10px;padding:16px 20px;font-size:12px;line-height:1.9;margin:18px 0}
code{font-family:Vazir,monospace;font-size:.88em}p code,li code,td code{direction:ltr;unicode-bidi:isolate;display:inline;background:#f1ede3;border-radius:4px;padding:1px 5px;color:#5c492a;overflow-wrap:anywhere}
pre code{font-size:inherit}strong{color:var(--green)}blockquote{background:var(--soft);border-right:3px solid var(--gold);padding:10px 20px;margin:18px 0}
.document-footer{text-align:center;font-size:12px;color:var(--muted);padding:5px 0 24px}
@media(max-width:1000px){.layout{grid-template-columns:1fr;padding:16px;gap:0}.sidebar{position:relative;top:0;max-height:none;margin-bottom:20px}.sidebar nav{display:none}.sidebar .print-button{width:auto;padding:8px 20px}.cover,.contents,.chapter{padding:30px}.cover{min-height:580px}}
@media(max-width:550px){body{font-size:14px}.layout{padding:10px}.cover,.contents,.chapter{padding:24px 20px;border-radius:16px}h1{font-size:34px}h2{font-size:22px}.contents-grid{grid-template-columns:1fr}.cover-meta{flex-direction:column}.cover .summary{font-size:16px}th,td{padding:8px;font-size:11px}}
@page{size:A4;margin:17mm 17mm 20mm;@bottom-right{content:"شهرازگلد · راهنمای جامع";font-family:Vazir;font-size:9px;color:#687873}@bottom-left{content:counter(page);font-family:Vazir;font-size:10px;color:#a67c36}}
@media print{html{scroll-behavior:auto}body{background:white;font-size:10.5pt;line-height:1.85;-webkit-print-color-adjust:exact;print-color-adjust:exact}.layout{display:block;max-width:none;padding:0}.sidebar,.document-footer{display:none}.cover,.contents,.chapter{border:0;border-radius:0;box-shadow:none;padding:0;margin:0}.cover{min-height:250mm;padding:15mm 12mm;background:linear-gradient(140deg,#fffefa 20%,#f8f1df 100%);break-after:page}.cover h1{font-size:42pt}.cover .summary{font-size:16pt}.cover-meta{font-size:10pt}.contents{break-after:page;padding-top:8mm}.contents-grid{grid-template-columns:1fr 1fr}.contents a{font-size:11pt;padding:8px 0}.chapter{break-before:page}.chapter h2{font-size:21pt;margin-bottom:17px}h3{font-size:13pt;break-after:avoid}h2{break-after:avoid}table{font-size:9pt;overflow:visible}thead{display:table-header-group}tr{break-inside:avoid}pre{font-size:9pt;break-inside:avoid;padding:12px 14px}p{orphans:3;widows:3}li{orphans:2;widows:2}a{color:inherit}td,th{padding:8px 10px}}
</style>
</head>
<body>
<div class="layout">
<aside class="sidebar" aria-label="فهرست فصل‌ها"><strong>شهرازگلد</strong><small>راهنمای جامع پروژه · نسخهٔ ۱٫۰</small><nav>__CONTENTS__</nav><button class="print-button" onclick="window.print()">چاپ / ذخیرهٔ PDF</button></aside>
<main>
<header class="cover">
<div class="brand"><span class="brandmark">ش</span><div><b>شهرازگلد</b><small>SHAHRAZGOLD</small></div></div>
<div><div class="eyebrow">راهنمای بهره‌برداری، توسعه و استقرار</div><h1>راهنمای جامع<br>شهرازگلد</h1><div class="cover-rule"></div><p class="summary">از مدیریت قیمت و اتصال خودکار هوم‌گلد تا ثبت درخواست، راه‌اندازی و انتشار سامانه.</p><div class="tags"><span>راهنمای مدیر</span><span>هوم‌گلد</span><span>توسعه و API</span><span>استقرار</span></div></div>
<div class="cover-meta"><div><b>نسخهٔ ۱٫۰</b>۲۰ مهر ۱۴۰۵ · ۱۲ اکتبر ۲۰۲۶</div><div><b>مبنای مستند</b>کد پروژه در شاخهٔ api-mali</div><div><b>۱۵ فصل کاربردی</b>فونت وزیر · آمادهٔ چاپ</div></div>
</header>
<section class="contents"><div class="eyebrow">مسیر مطالعه</div><h2>فهرست راهنما</h2><p>برای کار روزانه، فصل‌های ۴ تا ۸؛ برای توسعه، فصل‌های ۲، ۳ و ۱۰؛ و برای انتشار و نگهداری، فصل‌های ۱۲ تا ۱۴ را بخوانید.</p><div class="contents-grid">__CONTENTS__</div><p>این سند رفتار پیاده‌سازی فعلی را توضیح می‌دهد. نمونه‌ها آموزشی‌اند و هیچ رمز یا کلید واقعی در آن قرار ندارد.</p></section>
__BODY__
<footer class="document-footer">شهرازگلد · نسخهٔ ۱٫۰ · فونت وزیر · منبع قابل ویرایش در PROJECT_GUIDE.fa.md</footer>
</main>
</div>
</body>
</html>'''
    output = template.replace("__FONTS__", font_faces).replace("__CONTENTS__", contents).replace("__BODY__", content)
    target = DOCS / "PROJECT_GUIDE.fa.html"
    target.write_text(output, encoding="utf-8")
    print(f"Created {target.name}: {len(chapters)} chapters, embedded Vazir fonts")


if __name__ == "__main__":
    build()
