import fs from 'node:fs';

function replaceOnce(source, before, after, file) {
    const count = source.split(before).length - 1;

    if (count !== 1) {
        throw new Error(`${file}: expected one match, found ${count}`);
    }

    return source.replace(before, after);
}

function replaceMany(source, before, after, expected, file) {
    const count = source.split(before).length - 1;

    if (count !== expected) {
        throw new Error(`${file}: expected ${expected} matches, found ${count}`);
    }

    return source.split(before).join(after);
}

function patchAdminStore(file, variant) {
    let source = fs.readFileSync(file, 'utf8');

    if (variant === 'active') {
        source = replaceOnce(
            source,
            'priceStep:Number(e.price_step_rial??1e4)/10,updatedAt:',
            'priceStep:Number(e.price_step_rial??1e4)/10,sellPriceDifferenceToman:Number(e.sell_price_difference_rial??0)/10,updatedAt:',
            file,
        );
        source = replaceOnce(
            source,
            'trade_adjustment_enabled:e.priceDifferencePercent!==void 0,trade_adjustment_percent:String(Math.max(0,e.priceDifferencePercent??0))',
            'trade_adjustment_enabled:(e.sellPriceDifferenceToman??0)>0,trade_adjustment_percent:`0`,sell_price_difference_rial:Math.round(Math.max(0,e.sellPriceDifferenceToman??0)*10)',
            file,
        );
    } else {
        source = replaceOnce(
            source,
            'previousPrice:t,updatedAt:',
            'previousPrice:t,sellPriceDifferenceToman:Number(e.sell_price_difference_rial??0)/10,updatedAt:',
            file,
        );
        source = replaceOnce(
            source,
            'trade_adjustment_enabled:e.priceDifferencePercent!==void 0,trade_adjustment_percent:String(Math.max(0,e.priceDifferencePercent??0))',
            'trade_adjustment_enabled:(e.sellPriceDifferenceToman??0)>0,trade_adjustment_percent:`0`,sell_price_difference_rial:Math.round(Math.max(0,e.sellPriceDifferenceToman??0)*10)',
            file,
        );
    }

    fs.writeFileSync(file, source);
    process.stdout.write(`updated ${file}\n`);
}

function patchCustomerPrices(file, mapperName) {
    let source = fs.readFileSync(file, 'utf8');
    const start = source.indexOf(`function ${mapperName}(e){let t=Number(e.current_price?.raw_price_rial??0);return{`);
    const endMarker = '}}function ';
    const end = source.indexOf(endMarker, start);

    if (start < 0 || end < 0) {
        throw new Error(`${file}: product mapper not found`);
    }

    const oldMapper = source.slice(start, end + 1);
    const newMapper = oldMapper
        .replace(
            `function ${mapperName}(e){let t=Number(e.current_price?.raw_price_rial??0);return{`,
            `function ${mapperName}(e){let t=Number(e.current_price?.raw_price_rial??0),n=Math.max(0,Number(e.sell_price_difference_rial??0));return{`,
        )
        .replace(
            'sell:e.is_sellable?t:void 0',
            'sell:e.is_sellable&&t>n?t-n:void 0',
        );

    if (oldMapper === newMapper) {
        throw new Error(`${file}: customer sell-price mapping was not changed`);
    }

    source = `${source.slice(0, start)}${newMapper}${source.slice(end + 1)}`;
    fs.writeFileSync(file, source);
    process.stdout.write(`updated ${file}\n`);
}

function patchAdminPrices(file, config) {
    let source = fs.readFileSync(file, 'utf8');

    const oldPropertyCount = source.split('priceDifferencePercent').length - 1;
    if (oldPropertyCount < 5) {
        throw new Error(`${file}: price difference form fields not found`);
    }
    source = source.split('priceDifferencePercent').join('sellPriceDifferenceToman');

    source = replaceOnce(source, config.oldDifferenceFunction, config.newDifferenceFunction, file);
    source = replaceOnce(source, config.oldParse, config.newParse, file);
    source = replaceOnce(source, config.oldValidation, config.newValidation, file);
    source = replaceOnce(
        source,
        '`درصد اختلاف قیمت`',
        '`اختلاف قیمت خرید و فروش (تومان)`',
        file,
    );
    source = replaceOnce(
        source,
        'id:`product-difference`,inputMode:`decimal`',
        'id:`product-difference`,inputMode:`numeric`',
        file,
    );
    source = replaceOnce(source, 'placeholder:`مثلاً 2.5 یا -1.2`', 'placeholder:`مثلاً 50000`', file);
    source = replaceOnce(
        source,
        'children:`مقدار مثبت برای افزایش و مقدار منفی برای کاهش قیمت است.`',
        'children:`این مبلغ از قیمت خرید کم می‌شود تا قیمت فروش به مشتری محاسبه شود.`',
        file,
    );

    source = replaceMany(
        source,
        'children:[`هر `,e.unit,` · تومان`]',
        `children:[\`هر \`,e.unit,\` · تومان · اختلاف فروش: \`,${config.formatter}(e.sellPriceDifferenceToman),\` تومان\`]`,
        2,
        file,
    );

    source = replaceOnce(
        source,
        config.desktopEditButton,
        `${config.desktopDifferenceButton},${config.desktopEditButton}`,
        file,
    );
    source = replaceOnce(
        source,
        config.mobileEditButton,
        `${config.mobileDifferenceButton},${config.mobileEditButton}`,
        file,
    );

    fs.writeFileSync(file, source);
    process.stdout.write(`updated ${file}\n`);
}

const activePrices = {
    oldDifferenceFunction: 'function ue(e){if(!e.previousPrice)return``;let t=(e.price-e.previousPrice)/e.previousPrice*100;return Math.abs(t)<.005?``:t.toFixed(2)}',
    newDifferenceFunction: 'function ue(e){return e.sellPriceDifferenceToman?String(e.sellPriceDifferenceToman):``}',
    oldParse: 'c=b.sellPriceDifferenceToman.trim()===``?void 0:le(b.sellPriceDifferenceToman);',
    newParse: 'c=b.sellPriceDifferenceToman.trim()===``?0:G(b.sellPriceDifferenceToman);',
    oldValidation: 'c!==void 0&&(!Number.isFinite(c)||c<=-100)&&(n.sellPriceDifferenceToman=`درصد باید عددی و بزرگ‌تر از ۱۰۰- باشد.`)',
    newValidation: '(!Number.isFinite(c)||c<0||c>=o)&&(n.sellPriceDifferenceToman=`اختلاف باید عددی نامنفی و کمتر از قیمت خرید باشد.`)',
    formatter: 'j',
    desktopEditButton: '(0,H.jsx)(D,{type:`button`,variant:`ghost`,size:`icon`,onClick:()=>r(e),"aria-label":`ویرایش ${e.title}`,children:(0,H.jsx)(b,{className:`h-4 w-4`})})',
    desktopDifferenceButton: '(0,H.jsx)(D,{type:`button`,variant:`outline`,size:`sm`,onClick:()=>r(e),className:`h-8 px-2 text-[10px]`,"aria-label":`تنظیم اختلاف خرید و فروش ${e.title}`,title:`تنظیم اختلاف خرید و فروش`,children:`اختلاف`})',
    mobileEditButton: '(0,H.jsx)(D,{type:`button`,variant:`ghost`,size:`icon`,onClick:()=>r(e),className:`h-8 w-8 text-muted-foreground`,"aria-label":`ویرایش ${e.title}`,children:(0,H.jsx)(b,{className:`h-4 w-4`})})',
    mobileDifferenceButton: '(0,H.jsx)(D,{type:`button`,variant:`outline`,onClick:()=>r(e),className:`h-8 px-1.5 text-[9px]`,"aria-label":`تنظیم اختلاف خرید و فروش ${e.title}`,children:`اختلاف`})',
};

const legacyPrices = {
    oldDifferenceFunction: 'function de(e){if(!e.previousPrice)return``;let t=(e.price-e.previousPrice)/e.previousPrice*100;return Math.abs(t)<.005?``:t.toFixed(2)}',
    newDifferenceFunction: 'function de(e){return e.sellPriceDifferenceToman?String(e.sellPriceDifferenceToman):``}',
    oldParse: 'c=b.sellPriceDifferenceToman.trim()===``?void 0:ue(b.sellPriceDifferenceToman);',
    newParse: 'c=b.sellPriceDifferenceToman.trim()===``?0:U(b.sellPriceDifferenceToman);',
    oldValidation: 'c!==void 0&&(!Number.isFinite(c)||c<=-100)&&(n.sellPriceDifferenceToman=`درصد باید عددی و بزرگ‌تر از ۱۰۰- باشد.`)',
    newValidation: '(!Number.isFinite(c)||c<0||c>=o)&&(n.sellPriceDifferenceToman=`اختلاف باید عددی نامنفی و کمتر از قیمت خرید باشد.`)',
    formatter: 'k',
    desktopEditButton: '(0,B.jsx)(T,{type:`button`,variant:`ghost`,size:`icon`,onClick:()=>r(e),"aria-label":`ویرایش ${e.title}`,children:(0,B.jsx)(g,{className:`h-4 w-4`})})',
    desktopDifferenceButton: '(0,B.jsx)(T,{type:`button`,variant:`outline`,size:`sm`,onClick:()=>r(e),className:`h-8 px-2 text-[10px]`,"aria-label":`تنظیم اختلاف خرید و فروش ${e.title}`,title:`تنظیم اختلاف خرید و فروش`,children:`اختلاف`})',
    mobileEditButton: '(0,B.jsx)(T,{type:`button`,variant:`ghost`,size:`icon`,onClick:()=>r(e),className:`h-8 w-8 text-muted-foreground`,"aria-label":`ویرایش ${e.title}`,children:(0,B.jsx)(g,{className:`h-4 w-4`})})',
    mobileDifferenceButton: '(0,B.jsx)(T,{type:`button`,variant:`outline`,onClick:()=>r(e),className:`h-8 px-1.5 text-[9px]`,"aria-label":`تنظیم اختلاف خرید و فروش ${e.title}`,children:`اختلاف`})',
};

for (const prefix of ['public/assets', '../public_html/assets']) {
    patchAdminStore(`${prefix}/admin-page-CuqWI56t.js`, 'active');
    patchAdminStore(`${prefix}/admin-page-CaFu9x7w.js`, 'legacy');
    patchCustomerPrices(`${prefix}/api-data-CBt6rn-v.js`, '_');
    patchCustomerPrices(`${prefix}/api-data-CyG74Pcl.js`, 'h');
    patchAdminPrices(`${prefix}/admin.prices-Bb89p7ch.js`, activePrices);
    patchAdminPrices(`${prefix}/admin.prices-B2kScmXN.js`, legacyPrices);
}
