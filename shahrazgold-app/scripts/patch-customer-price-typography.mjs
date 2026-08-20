import fs from 'node:fs';

function replaceOnce(source, before, after, file) {
    const count = source.split(before).length - 1;

    if (count !== 1) {
        throw new Error(`${file}: expected one match, found ${count}`);
    }

    return source.replace(before, after);
}

function patch(file, replacements) {
    let source = fs.readFileSync(file, 'utf8');

    for (const [before, after] of replacements) {
        source = replaceOnce(source, before, after, file);
    }

    fs.writeFileSync(file, source);
    process.stdout.write(`updated ${file}\n`);
}

const dashboardReplacements = [
    [
        'text-[12.5px] font-extrabold tabular-nums sm:text-sm lg:text-base',
        'text-sm font-black tracking-tight tabular-nums sm:text-base lg:text-lg',
    ],
    [
        'mt-1 block whitespace-nowrap text-xs font-extrabold tabular-nums sm:text-sm',
        'mt-1 block whitespace-nowrap text-sm font-black tracking-tight tabular-nums sm:text-base',
    ],
];

const livePriceReplacements = [
    [
        'min-w-40 py-4 text-sm font-extrabold tabular-nums',
        'min-w-40 py-4 text-lg font-black tracking-tight tabular-nums',
    ],
    [
        'min-w-36 py-4 text-sm tabular-nums text-muted-foreground',
        'min-w-36 py-4 text-base font-extrabold tracking-tight tabular-nums text-muted-foreground',
    ],
    [
        'mt-1 text-2xl font-extrabold tabular-nums',
        'mt-1 text-3xl font-black tracking-tight tabular-nums',
    ],
    [
        'mt-1 font-bold tabular-nums',
        'mt-1 text-lg font-black tracking-tight tabular-nums',
    ],
];

const detailReplacements = [
    [
        'text-2xl font-extrabold leading-9 tabular-nums sm:text-3xl',
        'text-3xl font-black leading-9 tracking-tight tabular-nums sm:text-3xl',
    ],
    [
        'mt-1 text-lg font-extrabold tabular-nums text-positive sm:text-xl',
        'mt-1 text-2xl font-black tracking-tight tabular-nums text-positive sm:text-3xl',
    ],
    [
        'mt-1 truncate text-xs font-bold tabular-nums sm:text-sm',
        'mt-1 truncate text-sm font-extrabold tracking-tight tabular-nums sm:text-base',
    ],
];

for (const prefix of ['public/assets', '../public_html/assets']) {
    patch(`${prefix}/dashboard-C9q9xUMG.js`, dashboardReplacements);
    patch(`${prefix}/dashboard-vLFm9dg0.js`, dashboardReplacements);
    patch(`${prefix}/live-prices-D-EA1kY1.js`, livePriceReplacements);
    patch(`${prefix}/live-prices-jj8xKYoK.js`, livePriceReplacements);
    patch(`${prefix}/prices._symbol-CAKKwNWv.js`, detailReplacements);
    patch(`${prefix}/prices._symbol-BIP1fUNn.js`, detailReplacements);
}
