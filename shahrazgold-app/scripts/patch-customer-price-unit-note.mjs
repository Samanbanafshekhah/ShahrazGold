import fs from 'node:fs';
import path from 'node:path';

function replaceOnce(source, search, replacement, label, file) {
  const count = source.split(search).length - 1;
  if (count === 0 && source.includes(replacement)) {
    return source;
  }
  if (count !== 1) {
    throw new Error(`${file}: expected one ${label} match, found ${count}`);
  }

  return source.replace(search, replacement);
}

function patchDashboard(file) {
  let source = fs.readFileSync(file, 'utf8');
  const legacy = path.basename(file) === 'dashboard-vLFm9dg0.js';
  const tradeHandler = legacy
    ? '(e,t,n)=>{a.current=n,i({asset:e,action:t})}'
    : '(e,t,n)=>{s.current=n,o({asset:e,action:t})}';

  source = replaceOnce(
    source,
    'n===`IRR`?f(t):m(t,n)',
    'n===`IRR`?f(t).replace(` تومان`,``):m(t,n)',
    'customer price unit',
    file,
  );
  source = replaceOnce(
    source,
    'children:[`هر `,e.unit,` · `,e.currency===`IRR`?`تومان`:`دلار`]',
    'children:[`هر `,e.unit]',
    'product unit caption',
    file,
  );
  source = replaceOnce(
    source,
    `(0,D.jsx)(\`div\`,{className:\`mt-5 sm:mt-6\`,children:(0,D.jsx)(A,{assets:e,onTrade:${tradeHandler}})})`,
    `(0,D.jsxs)(\`div\`,{className:\`mt-5 sm:mt-6\`,children:[(0,D.jsx)(\`p\`,{className:\`px-3 text-xs font-bold text-muted-foreground sm:px-0\`,children:\`قیمت‌ها به تومان است\`}),(0,D.jsx)(\`div\`,{className:\`mt-2\`,children:(0,D.jsx)(A,{assets:e,onTrade:${tradeHandler}})})]})`,
    'price unit note',
    file,
  );

  fs.writeFileSync(file, source);
  console.log(`updated ${file}`);
}

function patchLivePrices(file) {
  let source = fs.readFileSync(file, 'utf8');

  source = replaceOnce(
    source,
    'children:[e&&(0,x.jsx)(C,{}),(0,x.jsxs)(`div`,{className:`rounded-2xl border border-border bg-card p-4 shadow-elegant`',
    'children:[e&&(0,x.jsx)(C,{}),(0,x.jsx)(`p`,{className:`text-xs font-bold text-muted-foreground`,children:`قیمت‌ها به تومان است`}),(0,x.jsxs)(`div`,{className:`rounded-2xl border border-border bg-card p-4 shadow-elegant`',
    'public price unit note',
    file,
  );
  source = replaceOnce(
    source,
    'function P(e){return`${l(e)} تومان`}',
    'function P(e){return l(e)}',
    'public price suffix',
    file,
  );

  fs.writeFileSync(file, source);
  console.log(`updated ${file}`);
}

const roots = [
  path.resolve('public/assets'),
  path.resolve('../public_html/assets'),
];

for (const root of roots) {
  for (const name of ['dashboard-C9q9xUMG.js', 'dashboard-vLFm9dg0.js']) {
    patchDashboard(path.join(root, name));
  }
  for (const name of ['live-prices-D-EA1kY1.js', 'live-prices-jj8xKYoK.js']) {
    patchLivePrices(path.join(root, name));
  }
}
