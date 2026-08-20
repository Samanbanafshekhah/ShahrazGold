import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const roots = [
  resolve(import.meta.dirname, '..', 'public', 'assets'),
  resolve(import.meta.dirname, '..', '..', 'public_html', 'assets'),
];

const files = roots.map((root) => resolve(root, 'admin.prices-Bb89p7ch.js'));

function replaceFunction(source, name, nextName, replacement) {
  const start = source.indexOf(`function ${name}(`);
  const end = source.indexOf(`function ${nextName}(`, start);

  if (start === -1 || end === -1) {
    throw new Error(`Could not locate function ${name} before ${nextName}`);
  }

  return source.slice(0, start) + replacement + source.slice(end);
}

const categorySection = `function de({title:e,description:t,items:n,onIncrease:r,onDecrease:i,onEdit:a,onPriceStepSetting:o,onDelete:s}){return(0,H.jsxs)(\`section\`,{className:\`overflow-hidden border-y border-border bg-card sm:rounded-2xl sm:border sm:shadow-elegant\`,children:[(0,H.jsxs)(\`header\`,{className:\`flex items-center justify-between gap-3 border-b border-border bg-muted/35 px-3 py-3 sm:px-5 sm:py-4\`,children:[(0,H.jsxs)(\`div\`,{className:\`min-w-0\`,children:[(0,H.jsx)(\`h2\`,{className:\`text-sm font-extrabold sm:text-base\`,children:e}),(0,H.jsx)(\`p\`,{className:\`mt-0.5 text-[10.5px] text-muted-foreground sm:text-xs\`,children:t})]}),(0,H.jsxs)(\`span\`,{className:\`shrink-0 rounded-full bg-gold-soft px-2.5 py-1 text-[10px] font-bold text-[color:var(--gold-dark)] sm:text-[11px]\`,children:[A(n.length),\` محصول\`]})]}),(0,H.jsx)(\`div\`,{className:\`grid gap-3 p-3 sm:grid-cols-2 sm:p-4 xl:grid-cols-3\`,children:n.map(e=>(0,H.jsx)(q,{item:e,onIncrease:r,onDecrease:i,onEdit:a,onPriceStepSetting:o,onDelete:s},e.id))})]})}`;

const priceCard = `function q({item:e,onIncrease:t,onDecrease:n,onEdit:r,onPriceStepSetting:i,onDelete:a}){let o=X(e),s=e.price<=e.priceStep;return(0,H.jsxs)(\`article\`,{className:\`overflow-hidden rounded-2xl border border-border bg-background shadow-sm transition hover:shadow-elegant\`,children:[(0,H.jsxs)(\`div\`,{className:\`p-4\`,children:[(0,H.jsxs)(\`div\`,{className:\`flex items-start justify-between gap-3\`,children:[(0,H.jsxs)(\`div\`,{className:\`min-w-0\`,children:[(0,H.jsx)(\`h3\`,{className:\`truncate text-sm font-extrabold sm:text-base\`,children:e.title}),(0,H.jsxs)(\`p\`,{className:\`mt-0.5 text-[10.5px] text-muted-foreground sm:text-[11px]\`,children:[\`هر \`,e.unit,\` · اختلاف فروش: \`,j(e.sellPriceDifferenceToman),\` تومان\`]})]}),(0,H.jsx)(Z,{meta:o,compact:!0})]}),(0,H.jsxs)(\`div\`,{className:\`my-4 text-center\`,children:[(0,H.jsx)(\`span\`,{className:\`text-[10px] font-bold text-muted-foreground\`,children:\`قیمت فعلی\`}),(0,H.jsxs)(\`strong\`,{className:\`mt-1 block text-2xl font-black tracking-tight tabular-nums\`,children:[j(e.price),\` تومان\`]})]}),(0,H.jsx)(J,{item:e,decreaseDisabled:s,onIncrease:t,onDecrease:n}),(0,H.jsxs)(\`p\`,{className:\`mt-3 text-center text-[10px] text-muted-foreground\`,children:[\`گام تغییر: \`,j(e.priceStep),\` تومان · بروزرسانی \`,M(e.updatedAt)]})]}),(0,H.jsxs)(\`div\`,{className:\`border-t border-border bg-card px-3 py-2\`,children:[(0,H.jsx)(\`div\`,{className:\`mb-1 text-[9px] font-bold text-muted-foreground\`,children:\`عملیات\`}),(0,H.jsxs)(\`div\`,{className:\`grid grid-cols-4 gap-1\`,children:[(0,H.jsx)(D,{type:\`button\`,variant:\`ghost\`,onClick:()=>i(e),className:\`h-8 px-1 text-[9px] font-bold text-[color:var(--gold-dark)] hover:bg-gold-soft\`,children:\`تنظیم گام\`}),(0,H.jsx)(D,{type:\`button\`,variant:\`ghost\`,onClick:()=>r(e),className:\`h-8 px-1 text-[9px] font-bold\`,children:\`اختلاف\`}),(0,H.jsx)(D,{type:\`button\`,variant:\`ghost\`,onClick:()=>r(e),className:\`h-8 px-1 text-[9px] font-bold\`,children:\`ویرایش\`}),(0,H.jsx)(D,{type:\`button\`,variant:\`ghost\`,onClick:()=>a(e),className:\`h-8 px-1 text-[9px] font-bold text-negative hover:bg-negative-soft hover:text-negative\`,children:\`حذف\`})]})]})]})}`;

const priceControls = `function J({item:e,decreaseDisabled:t,onIncrease:n,onDecrease:r}){return(0,H.jsxs)(\`div\`,{className:\`grid grid-cols-2 gap-2\`,children:[(0,H.jsx)(Y,{tone:\`increase\`,label:\`افزایش قیمت \${e.title} به \${j(e.price+e.priceStep)} تومان\`,value:e.price+e.priceStep,onClick:()=>n(e)}),(0,H.jsx)(Y,{tone:\`decrease\`,label:\`کاهش قیمت \${e.title} به \${j(Math.max(0,e.price-e.priceStep))} تومان\`,value:Math.max(0,e.price-e.priceStep),disabled:t,onClick:()=>r(e)})]})}`;

const priceButton = `function Y({tone:e,label:t,value:n,disabled:r,onClick:i}){let a=e===\`increase\`;return(0,H.jsxs)(D,{type:\`button\`,variant:\`ghost\`,disabled:r,onClick:i,className:\`h-auto min-h-16 w-full flex-col gap-0.5 rounded-xl border px-2 py-2 transition \`+(a?\`border-positive/25 bg-positive-soft text-positive hover:bg-positive-soft hover:text-positive\`:\`border-negative/25 bg-negative-soft text-negative hover:bg-negative-soft hover:text-negative disabled:opacity-40\`),"aria-label":t,title:t,children:[(0,H.jsx)(\`span\`,{className:\`text-[10px] font-bold opacity-80\`,children:a?\`افزایش قیمت\`:\`کاهش قیمت\`}),(0,H.jsx)(\`strong\`,{className:\`whitespace-nowrap text-sm font-black tabular-nums sm:text-base\`,children:j(n)}),(0,H.jsx)(\`span\`,{className:\`text-[9px] font-medium opacity-75\`,children:\`تومان\`})]})}`;

const dashboardCategorySection = `function de({title:e,description:t,items:n,onIncrease:r,onDecrease:i,onEdit:a,onPriceStepSetting:o,onDelete:s}){return(0,H.jsxs)(\`section\`,{className:\`overflow-hidden border-y border-border bg-card sm:rounded-2xl sm:border sm:shadow-elegant\`,children:[(0,H.jsxs)(\`header\`,{className:\`grid grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)_minmax(0,1.15fr)] items-end gap-1.5 border-b border-border bg-muted/35 px-3 py-3 sm:px-5 sm:py-4 xl:flex xl:items-center xl:justify-between xl:gap-3\`,children:[(0,H.jsxs)(\`div\`,{className:\`min-w-0\`,children:[(0,H.jsx)(\`h2\`,{className:\`text-sm font-extrabold sm:text-base\`,children:e}),(0,H.jsx)(\`p\`,{className:\`mt-0.5 text-[10px] text-muted-foreground sm:text-xs\`,children:t})]}),(0,H.jsx)(\`span\`,{className:\`text-center text-[10px] font-bold text-muted-foreground xl:hidden\`,children:\`افزایش\`}),(0,H.jsx)(\`span\`,{className:\`text-center text-[10px] font-bold text-muted-foreground xl:hidden\`,children:\`کاهش\`}),(0,H.jsxs)(\`span\`,{className:\`hidden shrink-0 rounded-full bg-gold-soft px-2.5 py-1 text-[10px] font-bold text-[color:var(--gold-dark)] sm:text-[11px] xl:inline-flex\`,children:[A(n.length),\` محصول\`]})]}),(0,H.jsxs)(\`div\`,{className:\`admin-price-header-grid hidden grid-cols-[minmax(170px,1.4fr)_minmax(150px,1fr)_minmax(150px,1fr)_90px_120px] gap-3 border-b border-border px-5 py-2.5 text-[11px] text-muted-foreground xl:grid\`,children:[(0,H.jsx)(\`span\`,{children:\`محصول\`}),(0,H.jsx)(\`span\`,{children:\`افزایش\`}),(0,H.jsx)(\`span\`,{children:\`کاهش\`}),(0,H.jsx)(\`span\`,{children:\`تغییر\`}),(0,H.jsx)(\`span\`,{children:\`عملیات\`})]}),(0,H.jsx)(\`div\`,{className:\`divide-y divide-border/80\`,children:n.map(e=>(0,H.jsx)(q,{item:e,onIncrease:r,onDecrease:i,onEdit:a,onPriceStepSetting:o,onDelete:s},e.id))})]})}`;

const dashboardPriceRow = `function q({item:e,onIncrease:t,onDecrease:n,onEdit:r,onPriceStepSetting:i,onDelete:a}){let o=X(e),s=e.price<=e.priceStep;return(0,H.jsxs)(\`article\`,{className:\`px-3 py-3 transition-colors hover:bg-muted/25 sm:px-5 sm:py-4\`,children:[(0,H.jsxs)(\`div\`,{className:\`admin-price-row-grid grid grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)_minmax(0,1.15fr)] items-center gap-1.5 xl:grid-cols-[minmax(170px,1.4fr)_minmax(150px,1fr)_minmax(150px,1fr)_90px_120px] xl:gap-3\`,children:[(0,H.jsxs)(\`div\`,{className:\`group min-w-0\`,children:[(0,H.jsx)(\`h3\`,{className:\`truncate text-[12.5px] font-bold transition-colors group-hover:text-[color:var(--gold-dark)] sm:text-sm\`,children:e.title}),(0,H.jsxs)(\`p\`,{className:\`mt-0.5 text-[9.5px] text-muted-foreground sm:text-[10px]\`,children:[\`هر \`,e.unit,\` · گام \`,j(e.priceStep)]})]}),(0,H.jsx)(Y,{tone:\`increase\`,label:\`افزایش قیمت \${e.title} به \${j(e.price+e.priceStep)} تومان\`,value:e.price+e.priceStep,onClick:()=>t(e)}),(0,H.jsx)(Y,{tone:\`decrease\`,label:\`کاهش قیمت \${e.title} به \${j(Math.max(0,e.price-e.priceStep))} تومان\`,value:Math.max(0,e.price-e.priceStep),disabled:s,onClick:()=>n(e)}),(0,H.jsx)(\`div\`,{className:\`hidden xl:block\`,children:(0,H.jsx)(Z,{meta:o})}),(0,H.jsxs)(\`div\`,{className:\`hidden items-center gap-1 xl:flex\`,children:[(0,H.jsx)(D,{type:\`button\`,variant:\`ghost\`,size:\`icon\`,onClick:()=>i(e),className:\`h-8 w-full min-w-0 px-0 text-[color:var(--gold-dark)] hover:bg-gold-soft hover:text-[color:var(--gold-dark)]\`,"aria-label":\`تنظیم گام قیمت \${e.title}\`,title:\`تنظیم گام قیمت\`,children:(0,H.jsx)(z,{className:\`h-4 w-4\`})}),(0,H.jsx)(D,{type:\`button\`,variant:\`outline\`,size:\`sm\`,onClick:()=>r(e),className:\`h-8 w-full min-w-0 px-0 text-[9px]\`,"aria-label":\`تنظیم اختلاف خرید و فروش \${e.title}\`,title:\`تنظیم اختلاف خرید و فروش\`,children:\`اختلاف\`}),(0,H.jsx)(D,{type:\`button\`,variant:\`ghost\`,size:\`icon\`,onClick:()=>r(e),"aria-label":\`ویرایش \${e.title}\`,children:(0,H.jsx)(b,{className:\`h-4 w-4\`})}),(0,H.jsx)(D,{type:\`button\`,variant:\`ghost\`,size:\`icon\`,onClick:()=>a(e),className:\`text-negative hover:bg-negative-soft hover:text-negative\`,"aria-label":\`حذف \${e.title}\`,children:(0,H.jsx)(T,{className:\`h-4 w-4\`})})]})]}),(0,H.jsxs)(\`div\`,{className:\`mt-2 flex items-center justify-between gap-2 border-t border-border/50 pt-2 xl:hidden\`,children:[(0,H.jsxs)(\`div\`,{className:\`flex min-w-0 items-center gap-2\`,children:[(0,H.jsx)(Z,{meta:o,compact:!0}),(0,H.jsx)(\`span\`,{className:\`truncate text-[10px] text-muted-foreground\`,children:M(e.updatedAt)})]}),(0,H.jsxs)(\`div\`,{className:\`flex shrink-0 items-center gap-0.5\`,children:[(0,H.jsx)(D,{type:\`button\`,variant:\`ghost\`,size:\`icon\`,onClick:()=>i(e),className:\`h-8 w-8 text-[color:var(--gold-dark)] hover:bg-gold-soft hover:text-[color:var(--gold-dark)]\`,"aria-label":\`تنظیم گام قیمت \${e.title}\`,children:(0,H.jsx)(z,{className:\`h-4 w-4\`})}),(0,H.jsx)(D,{type:\`button\`,variant:\`outline\`,onClick:()=>r(e),className:\`h-8 px-1.5 text-[9px]\`,"aria-label":\`تنظیم اختلاف خرید و فروش \${e.title}\`,children:\`اختلاف\`}),(0,H.jsx)(D,{type:\`button\`,variant:\`ghost\`,size:\`icon\`,onClick:()=>r(e),className:\`h-8 w-8 text-muted-foreground\`,"aria-label":\`ویرایش \${e.title}\`,children:(0,H.jsx)(b,{className:\`h-4 w-4\`})}),(0,H.jsx)(D,{type:\`button\`,variant:\`ghost\`,size:\`icon\`,onClick:()=>a(e),className:\`h-8 w-8 text-muted-foreground hover:bg-negative-soft hover:text-negative\`,"aria-label":\`حذف \${e.title}\`,children:(0,H.jsx)(T,{className:\`h-4 w-4\`})})]})]})]})}`;

const dashboardPriceButton = `function Y({tone:e,label:t,value:n,disabled:r,onClick:i}){let a=e===\`increase\`;return(0,H.jsxs)(\`button\`,{type:\`button\`,disabled:r,onClick:i,"aria-label":t,title:t,className:\`min-w-0 rounded-lg px-1 py-2 text-center transition-colors enabled:cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed sm:px-2 xl:text-start \`+(a?\`bg-positive-soft\`:\`bg-negative-soft disabled:bg-muted/55\`),children:[(0,H.jsx)(\`span\`,{className:\`sr-only\`,children:a?\`افزایش\`:\`کاهش\`}),(0,H.jsx)(\`strong\`,{className:\`block whitespace-nowrap text-sm font-black tracking-tight tabular-nums sm:text-base lg:text-lg \`+(a?\`text-positive\`:\`text-negative\`),children:j(n)})]})}`;

for (const file of files) {
  let source = await readFile(file, 'utf8');
  source = replaceFunction(source, 'de', 'q', dashboardCategorySection);
  source = replaceFunction(source, 'q', 'J', dashboardPriceRow);
  source = replaceFunction(source, 'J', 'Y', priceControls);
  source = replaceFunction(source, 'Y', 'X', dashboardPriceButton);
  source = source
    .replace(
      'مقدار تغییر دکمه‌های مثبت و منفی برای هر محصول جداگانه قابل تنظیم است.',
      'قیمت سبز یک گام افزایش و قیمت قرمز یک گام کاهش را ثبت می‌کند؛ مقدار گام هر محصول جداگانه قابل تنظیم است.',
    )
    .replace(
      'مقدار تغییر دکمه‌های مثبت و منفی «${q.title}» را مشخص کنید.',
      'مقدار هر گام تغییر قیمت «${q.title}» را مشخص کنید.',
    );
  await writeFile(file, source);
  process.stdout.write(`Patched ${file}\n`);
}

const desktopLayoutCss = `
/* shahraz-admin-price-desktop-layout:start */
@media (min-width:1280px){
  .admin-price-header-grid,
  .admin-price-row-grid{
    grid-template-columns:minmax(170px,1.4fr) minmax(150px,1fr) minmax(150px,1fr) 90px 180px;
  }
}
/* shahraz-admin-price-desktop-layout:end */
`;

for (const root of roots) {
  const cssFile = resolve(root, 'styles-CskgIB_T.css');
  let css = await readFile(cssFile, 'utf8');
  css = css.replace(
    /\/\* shahraz-admin-price-desktop-layout:start \*\/[\s\S]*?\/\* shahraz-admin-price-desktop-layout:end \*\/\n?/,
    '',
  );
  await writeFile(cssFile, css + desktopLayoutCss);
  process.stdout.write(`Patched ${cssFile}\n`);
}
