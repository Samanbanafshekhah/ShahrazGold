import fs from 'node:fs';

function replaceOnce(source, before, after, file) {
    const count = source.split(before).length - 1;

    if (count !== 1) {
        throw new Error(`${file}: expected one match, found ${count}`);
    }

    return source.replace(before, after);
}

function patchCustomerDashboard(file, statePrefix) {
    let source = fs.readFileSync(file, 'utf8');

    source = replaceOnce(
        source,
        'function k({updatedAt:e,refreshing:t})',
        'function k({updatedAt:e,refreshing:t,managerOnline:n})',
        file,
    );
    source = replaceOnce(
        source,
        '),(0,D.jsxs)(`span`,{className:`inline-flex items-center gap-1.5 text-[11px] font-bold text-positive sm:text-xs`',
        '),(0,D.jsxs)(`span`,{className:`inline-flex items-center gap-1.5 text-[11px] font-bold sm:text-xs `+(n?`text-positive`:`text-negative`)',
        file,
    );
    source = replaceOnce(
        source,
        'children:[!t&&(0,D.jsx)(`span`,{className:`absolute inline-flex h-full w-full animate-ping rounded-full bg-[color:var(--positive)] opacity-30`}),(0,D.jsx)(`span`,{className:`relative inline-flex h-2 w-2 rounded-full bg-[color:var(--positive)]`})]}),t?`در حال دریافت قیمت`:`مدیر آنلاین است`]})',
        'children:[!t&&n&&(0,D.jsx)(`span`,{className:`absolute inline-flex h-full w-full animate-ping rounded-full bg-[color:var(--positive)] opacity-30`}),(0,D.jsx)(`span`,{className:`relative inline-flex h-2 w-2 rounded-full `+(n?`bg-[color:var(--positive)]`:`bg-[color:var(--negative)]`)})]}),n?`مدیر آنلاین است`:`مدیر آفلاین است`]})',
        file,
    );
    source = replaceOnce(
        source,
        statePrefix,
        `${statePrefix}[q,z]=(0,E.useState)(!1),`,
        file,
    );
    source = replaceOnce(
        source,
        ';async function p(){',
        ';async function H(){try{let e=await fetch(`/api/v1/manager-status`,{headers:{Accept:`application/json`}}),t=await e.json();e.ok&&z(Boolean(t?.data?.online))}catch{}}async function p(){',
        file,
    );
    source = replaceOnce(
        source,
        'return(0,E.useEffect)(()=>{let e=window.setInterval(async()=>{await x()},45e3);return()=>window.clearInterval(e)},[])',
        'return(0,E.useEffect)(()=>{H();let e=window.setInterval(H,3e3);return()=>window.clearInterval(e)},[]),(0,E.useEffect)(()=>{let e=window.setInterval(async()=>{await x()},45e3);return()=>window.clearInterval(e)},[])',
        file,
    );
    source = replaceOnce(
        source,
        '(0,D.jsx)(k,{updatedAt:f,refreshing:t})',
        '(0,D.jsx)(k,{updatedAt:f,refreshing:t,managerOnline:q})',
        file,
    );

    fs.writeFileSync(file, source);
    process.stdout.write(`updated ${file}\n`);
}

function patchAdminDashboard(file, formatImport, statePrefix) {
    let source = fs.readFileSync(file, 'utf8');

    source = replaceOnce(
        source,
        formatImport,
        `${formatImport.slice(0, -4)};import{r as A}from"./api-DMFU5XXd.js";var`,
        file,
    );
    source = replaceOnce(
        source,
        statePrefix,
        `${statePrefix}[q,z]=(0,C.useState)(!1),[B,V]=(0,C.useState)(!1),`,
        file,
    );
    source = replaceOnce(
        source,
        'D=(0,C.useMemo)(()=>o(),[t]);return',
        'D=(0,C.useMemo)(()=>o(),[t]);async function H(){V(!0);try{let e=await A(`admin/manager-status`,{method:`PUT`,body:JSON.stringify({online:!q})});z(Boolean(e.data.online))}catch{}finally{V(!1)}}return(0,C.useEffect)(()=>{A(`manager-status`,{authenticated:!1}).then(e=>z(Boolean(e.data.online))).catch(()=>{})},[]),',
        file,
    );

    const componentStart = source.indexOf('function E()');
    const announcementMarker = '(0,w.jsxs)(`section`,{className:`flex min-w-0 max-w-full flex-col gap-3 overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-elegant`';
    const insertAt = source.indexOf(announcementMarker, componentStart);

    if (componentStart < 0 || insertAt < 0) {
        throw new Error(`${file}: dashboard insertion point not found`);
    }

    const statusSection = '(0,w.jsxs)(`section`,{className:`flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 shadow-elegant sm:flex-row sm:items-center sm:justify-between`,children:[(0,w.jsxs)(`div`,{className:`min-w-0`,children:[(0,w.jsx)(`h2`,{className:`text-sm font-bold`,children:`وضعیت مدیر برای مشتریان`}),(0,w.jsx)(`p`,{className:`mt-1 text-xs leading-6 text-muted-foreground`,children:`با روشن‌کردن این گزینه، پیام «مدیر آنلاین است» در داشبورد مشتریان نمایش داده می‌شود.`})]}),(0,w.jsx)(`button`,{type:`button`,onClick:()=>void H(),disabled:B,"aria-pressed":q,className:`inline-flex min-w-24 items-center justify-center rounded-xl px-4 py-2.5 text-xs font-bold transition disabled:cursor-wait disabled:opacity-60 `+(q?`bg-positive text-white`:`bg-muted text-muted-foreground`),children:B?`در حال ذخیره…`:q?`روشن`:`خاموش`})]})';
    source = `${source.slice(0, insertAt)}${statusSection},${source.slice(insertAt)}`;

    fs.writeFileSync(file, source);
    process.stdout.write(`updated ${file}\n`);
}

for (const prefix of ['public/assets', '../public_html/assets']) {
    patchCustomerDashboard(
        `${prefix}/dashboard-C9q9xUMG.js`,
        'function L(){let{items:e}=b(),[t,n]=(0,E.useState)(!1),[a,o]=(0,E.useState)(null),',
    );
    patchCustomerDashboard(
        `${prefix}/dashboard-vLFm9dg0.js`,
        'function L(){let{items:e}=b(),[t,n]=(0,E.useState)(!1),[r,i]=(0,E.useState)(null),',
    );
    patchAdminDashboard(
        `${prefix}/admin.index-BiCsvhVi.js`,
        'import{c as v,p as y,s as b}from"./formatters-DZfDL5-K.js";var',
        'function E(){let e=d(),t=a(),n=c(),i=s(),',
    );
    patchAdminDashboard(
        `${prefix}/admin.index-CYCMtDLy.js`,
        'import{c as g,p as _,s as v}from"./formatters-DZfDL5-K.js";var',
        'function E(){let e=a(),t=s(),n=u(),i=c(),',
    );
}
