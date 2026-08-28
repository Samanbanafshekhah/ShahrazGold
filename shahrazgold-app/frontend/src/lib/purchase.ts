import type { GoldAsset } from "./types";
import { formatNumber, toPersianDigits } from "./formatters";

export type PurchaseMode = "amount" | "quantity";
export type TradeAction = "buy" | "sell";

export interface PurchaseProduct {
    id: string;
    productId?: number;
    symbol: string;
    title: string;
    unit: string;
    unitPrice: number;
    amountDivisor: number;
    priceUnit: "تومان" | "دلار";
    updatedAt: string;
    change?: number;
    changePercent?: number;
    available?: boolean;
}

export interface PurchaseCalculation {
    quantity: number;
    total: number;
    valid: boolean;
}

export function purchaseProductFromAsset(
    asset: GoldAsset,
    action: TradeAction = "buy",
): PurchaseProduct {
    const price = action === "buy" ? asset.buy : asset.sell;
    return {
        id: asset.symbol,
        productId: asset.productId,
        symbol: asset.symbol,
        title: asset.title,
        unit: asset.unit,
        unitPrice: asset.currency === "IRR" ? (price ?? 0) / 10 : (price ?? 0),
        amountDivisor: asset.tradeAmountDivisor ?? 1,
        priceUnit: asset.currency === "IRR" ? "تومان" : "دلار",
        updatedAt: asset.updatedAt,
        change: asset.change,
        changePercent: asset.changePercent,
        available: asset.available !== false && price !== undefined && price > 0,
    };
}

export function getPurchaseAvailabilityError(
    product: PurchaseProduct,
    action: TradeAction = "buy",
): string | undefined {
    if (
        product.available === false ||
        !Number.isFinite(product.unitPrice) ||
        product.unitPrice <= 0
    ) {
        return `قیمت ${action === "buy" ? "خرید" : "فروش"} این محصول در حال حاضر در دسترس نیست.`;
    }

    const updatedAt = new Date(product.updatedAt).getTime();
    if (!Number.isFinite(updatedAt)) return "زمان به‌روزرسانی قیمت این محصول مشخص نیست.";
    return undefined;
}

export function calculatePurchase(
    mode: PurchaseMode,
    amount: string,
    quantity: string,
    unitPrice: number,
    amountDivisor = 1,
): PurchaseCalculation {
    const numericAmount = parsePositivePurchaseNumber(amount);
    const numericQuantity = parsePositivePurchaseNumber(quantity);
    const calculatedQuantity =
        mode === "amount"
            ? (numericAmount * validAmountDivisor(amountDivisor)) / unitPrice
            : numericQuantity;
    const calculatedTotal =
        mode === "quantity"
            ? multiplyDecimalByNumber(quantity, unitPrice) / validAmountDivisor(amountDivisor)
            : numericAmount;
    const valid =
        Number.isFinite(calculatedQuantity) &&
        Number.isFinite(calculatedTotal) &&
        calculatedQuantity > 0 &&
        calculatedTotal > 0 &&
        Number.isSafeInteger(Math.round(calculatedTotal * 10));

    return {
        quantity: valid ? calculatedQuantity : 0,
        total: valid ? calculatedTotal : 0,
        valid,
    };
}

function validAmountDivisor(divisor: number): number {
    return Number.isFinite(divisor) && divisor > 0 ? divisor : 1;
}

export function parsePositivePurchaseNumber(value: string): number {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? number : 0;
}

export function normalizePurchaseInput(
    input: string,
    options: { grouped?: boolean } = {},
): { value: string; invalid: boolean } {
    const english = input
        .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
        .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
        .replace(/٫/g, ".")
        .trim();
    const allowedPattern = options.grouped ? /^[\d.,٬\s-]*$/ : /^[\d.,\s-]*$/;
    const invalidCharacters = !allowedPattern.test(english);
    const negative = english.includes("-");
    const withoutGroups = options.grouped
        ? english.replace(/[,٬\s]/g, "")
        : english.replace(/[\s]/g, "").replace(/,/g, ".");
    const unsigned = withoutGroups.replace(/-/g, "").replace(/[^\d.]/g, "");
    const [head = "", ...tail] = unsigned.split(".");
    const value = `${negative ? "-" : ""}${head}${tail.length ? `.${tail.join("")}` : ""}`;
    const invalidMinus = negative && !english.startsWith("-");
    return { value, invalid: invalidCharacters || invalidMinus || negative };
}

export function formatPurchaseInput(value: string, grouped = false): string {
    if (!value || value === "-") return value;
    const sign = value.startsWith("-") ? "-" : "";
    const [integer, fraction] = value.replace("-", "").split(".");
    const formattedInteger = grouped ? integer.replace(/\B(?=(\d{3})+(?!\d))/g, ",") : integer;
    return toPersianDigits(
        `${sign}${formattedInteger}${fraction !== undefined ? `.${fraction}` : ""}`,
    );
}

export function formatPurchaseMoney(
    value: number,
    priceUnit: PurchaseProduct["priceUnit"],
): string {
    return `${formatNumber(Math.round(value))} ${priceUnit}`;
}

export function formatPurchaseQuantity(value: number, unit: string): string {
    if (!value) return `${formatNumber(0)} ${unit}`;
    return `${formatNumber(value, unit === "عدد" || unit === "واحد" ? 3 : 4)} ${unit}`;
}

function multiplyDecimalByNumber(decimal: string, multiplier: number): number {
    const match = decimal.match(/^(\d+)(?:\.(\d+))?$/);
    if (!match || !Number.isFinite(multiplier)) return 0;
    const fraction = match[2] ?? "";
    const decimalInteger = BigInt(`${match[1]}${fraction}`);
    const multiplierString = String(multiplier);
    const multiplierMatch = multiplierString.match(/^(\d+)(?:\.(\d+))?$/);
    if (!multiplierMatch) return Number(decimal) * multiplier;
    const multiplierFraction = multiplierMatch[2] ?? "";
    const multiplierInteger = BigInt(`${multiplierMatch[1]}${multiplierFraction}`);
    const scale = 10 ** (fraction.length + multiplierFraction.length);
    return Number(decimalInteger * multiplierInteger) / scale;
}
