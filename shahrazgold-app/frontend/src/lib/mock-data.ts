import type { GoldAsset, Transaction } from "./types";

const USER_TRANSACTIONS_KEY = "shg_user_transactions";

// NOTE: these values are illustrative only, not live market prices.
const BASE_ASSETS: GoldAsset[] = [
  {
    symbol: "MELTED_CASH",
    title: "آبشده نقدی",
    category: "melted",
    unit: "مثقال",
    price: 339_400_000,
    currency: "IRR",
    buy: 338_200_000,
    sell: 339_400_000,
    change: 610_000,
    changePercent: 0.18,
    high: 340_100_000,
    low: 337_900_000,
    open: 338_790_000,
    updatedAt: new Date().toISOString(),
  },
  {
    symbol: "MELTED_TOMORROW",
    title: "آبشده فردایی",
    category: "melted",
    unit: "مثقال",
    price: 340_150_000,
    currency: "IRR",
    buy: 338_900_000,
    sell: 340_150_000,
    change: -350_000,
    changePercent: -0.1,
    high: 341_000_000,
    low: 338_600_000,
    open: 340_500_000,
    updatedAt: new Date().toISOString(),
  },
  {
    symbol: "MELTED_TRANSFER",
    title: "آبشده حواله‌ای",
    category: "melted",
    unit: "مثقال",
    price: 338_750_000,
    currency: "IRR",
    buy: 337_650_000,
    sell: 338_750_000,
    change: 0,
    changePercent: 0,
    high: 339_200_000,
    low: 337_400_000,
    open: 338_750_000,
    updatedAt: new Date().toISOString(),
  },
  {
    symbol: "GOLD18",
    title: "طلای ۱۸ عیار",
    category: "gold",
    unit: "گرم",
    price: 77_860_000,
    currency: "IRR",
    buy: 77_620_000,
    sell: 77_860_000,
    change: 240_000,
    changePercent: 0.31,
    high: 78_150_000,
    low: 77_410_000,
    open: 77_620_000,
    updatedAt: new Date().toISOString(),
  },
  {
    symbol: "GOLD24",
    title: "طلای ۲۴ عیار",
    category: "gold",
    unit: "گرم",
    price: 103_810_000,
    currency: "IRR",
    buy: 103_480_000,
    sell: 103_810_000,
    change: 310_000,
    changePercent: 0.3,
    high: 104_120_000,
    low: 103_240_000,
    open: 103_500_000,
    updatedAt: new Date().toISOString(),
  },
  {
    symbol: "MITHQAL",
    title: "مثقال طلا",
    category: "gold",
    unit: "مثقال",
    price: 337_250_000,
    currency: "IRR",
    buy: 336_100_000,
    sell: 337_250_000,
    change: -420_000,
    changePercent: -0.12,
    high: 338_100_000,
    low: 336_500_000,
    open: 337_670_000,
    updatedAt: new Date().toISOString(),
  },
  {
    symbol: "OUNCE",
    title: "اونس جهانی طلا",
    category: "gold",
    unit: "اونس",
    price: 2370.45,
    currency: "USD",
    buy: 2368.1,
    sell: 2370.45,
    change: 5.4,
    changePercent: 0.23,
    high: 2374.2,
    low: 2361.1,
    open: 2365.05,
    updatedAt: new Date().toISOString(),
  },
  {
    symbol: "EMAMI",
    title: "سکه امامی",
    category: "coin",
    unit: "عدد",
    price: 1_810_500_000,
    currency: "IRR",
    buy: 1_805_000_000,
    sell: 1_810_500_000,
    change: 4_500_000,
    changePercent: 0.25,
    high: 1_818_000_000,
    low: 1_802_000_000,
    open: 1_806_000_000,
    updatedAt: new Date().toISOString(),
  },
  {
    symbol: "BAHAR",
    title: "سکه بهار آزادی",
    category: "coin",
    unit: "عدد",
    price: 1_770_000_000,
    currency: "IRR",
    buy: 1_765_000_000,
    sell: 1_770_000_000,
    change: 0,
    changePercent: 0,
    high: 1_772_000_000,
    low: 1_766_000_000,
    open: 1_770_000_000,
    updatedAt: new Date().toISOString(),
  },
  {
    symbol: "HALF",
    title: "نیم‌سکه",
    category: "coin",
    unit: "عدد",
    price: 947_000_000,
    currency: "IRR",
    buy: 942_500_000,
    sell: 947_000_000,
    change: -2_000_000,
    changePercent: -0.21,
    high: 949_500_000,
    low: 945_000_000,
    open: 949_000_000,
    updatedAt: new Date().toISOString(),
  },
  {
    symbol: "QUARTER",
    title: "ربع‌سکه",
    category: "coin",
    unit: "عدد",
    price: 540_000_000,
    currency: "IRR",
    buy: 537_500_000,
    sell: 540_000_000,
    change: 1_200_000,
    changePercent: 0.22,
    high: 541_500_000,
    low: 538_500_000,
    open: 538_800_000,
    updatedAt: new Date().toISOString(),
  },
  {
    symbol: "GRAM",
    title: "سکه گرمی",
    category: "coin",
    unit: "عدد",
    price: 265_000_000,
    currency: "IRR",
    buy: 263_500_000,
    sell: undefined,
    change: -300_000,
    changePercent: -0.11,
    high: 266_000_000,
    low: 264_500_000,
    open: 265_300_000,
    updatedAt: new Date().toISOString(),
  },
];

let ASSETS: GoldAsset[] = BASE_ASSETS.map((a) => ({ ...a }));

const USD_RATE = 705_000; // rials per usd for context stat

export function getAssets(): GoldAsset[] {
  return ASSETS.map((a) => ({ ...a }));
}

export function getAsset(symbol: string): GoldAsset | undefined {
  const a = ASSETS.find((x) => x.symbol.toLowerCase() === symbol.toLowerCase());
  return a ? { ...a } : undefined;
}

export function getUsdRate(): number {
  return USD_RATE;
}

function jitter(base: number, pct = 0.004): number {
  const delta = base * pct * (Math.random() * 2 - 1);
  return base + delta;
}

/** Simulate a live refresh — returns updated snapshot after a short delay. */
export async function refreshAssets(): Promise<GoldAsset[]> {
  await new Promise((r) => setTimeout(r, 650));
  ASSETS = ASSETS.map((a) => {
    const newPrice = Math.round(jitter(a.price));
    const change = newPrice - a.open;
    const changePercent = (change / a.open) * 100;
    return {
      ...a,
      price: newPrice,
      change,
      changePercent: Number(changePercent.toFixed(2)),
      high: Math.max(a.high, newPrice),
      low: Math.min(a.low, newPrice),
      buy: a.buy ? Math.round(jitter(a.buy)) : undefined,
      sell: a.sell !== undefined ? newPrice : undefined,
      updatedAt: new Date().toISOString(),
    };
  });
  return getAssets();
}

const MOCK_TRANSACTIONS: Transaction[] = [
  {
    id: "tx-1001",
    trackingCode: "SHG-8842013",
    type: "buy",
    assetSymbol: "GOLD18",
    assetTitle: "طلای ۱۸ عیار",
    quantity: 2.5,
    unit: "گرم",
    unitPrice: 77_620_000,
    total: 194_050_000,
    status: "completed",
    createdAt: "2025-06-24T09:12:00.000Z",
    updatedAt: "2025-06-24T09:31:00.000Z",
    description: "خرید طلای آب‌شده ۱۸ عیار",
  },
  {
    id: "tx-1003",
    trackingCode: "SHG-8841990",
    type: "buy",
    assetSymbol: "HALF",
    assetTitle: "نیم‌سکه",
    quantity: 2,
    unit: "عدد",
    unitPrice: 949_500_000,
    total: 1_899_000_000,
    status: "pending",
    createdAt: "2025-06-20T11:45:00.000Z",
    updatedAt: "2025-06-20T11:45:00.000Z",
    description: "در انتظار تأیید کارشناس",
  },
  {
    id: "tx-1005",
    trackingCode: "SHG-8841755",
    type: "buy",
    assetSymbol: "QUARTER",
    assetTitle: "ربع‌سکه",
    quantity: 4,
    unit: "عدد",
    unitPrice: 539_000_000,
    total: 2_156_000_000,
    status: "completed",
    createdAt: "2025-06-15T16:32:00.000Z",
    updatedAt: "2025-06-15T17:05:00.000Z",
  },
  {
    id: "tx-1006",
    trackingCode: "SHG-8841690",
    type: "buy",
    assetSymbol: "GRAM",
    assetTitle: "سکه گرمی",
    quantity: 3,
    unit: "عدد",
    unitPrice: 265_300_000,
    total: 795_900_000,
    status: "canceled",
    createdAt: "2025-06-12T10:11:00.000Z",
    updatedAt: "2025-06-12T10:40:00.000Z",
    description: "لغو توسط کاربر",
  },
  {
    id: "tx-1008",
    trackingCode: "SHG-8841320",
    type: "buy",
    assetSymbol: "MITHQAL",
    assetTitle: "مثقال طلا",
    quantity: 1,
    unit: "مثقال",
    unitPrice: 336_800_000,
    total: 336_800_000,
    status: "approved",
    createdAt: "2025-06-04T09:00:00.000Z",
    updatedAt: "2025-06-04T09:20:00.000Z",
  },
];

function readUserTransactions(): Transaction[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(USER_TRANSACTIONS_KEY);
    return raw ? (JSON.parse(raw) as Transaction[]) : [];
  } catch {
    return [];
  }
}

function writeUserTransactions(items: Transaction[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(USER_TRANSACTIONS_KEY, JSON.stringify(items));
}

export function createBuyTransaction(input: {
  assetSymbol: string;
  assetTitle: string;
  quantity: number;
  unit: string;
  unitPriceToman: number;
  totalToman: number;
}): Transaction {
  const now = new Date().toISOString();
  const id = `tx-user-${Date.now()}`;
  const trackingCode = `SHG-${Math.floor(1000000 + Math.random() * 9000000)}`;
  const transaction: Transaction = {
    id,
    trackingCode,
    type: "buy",
    assetSymbol: input.assetSymbol,
    assetTitle: input.assetTitle,
    quantity: input.quantity,
    unit: input.unit,
    unitPrice: Math.round(input.unitPriceToman * 10),
    total: Math.round(input.totalToman * 10),
    status: "pending",
    createdAt: now,
    updatedAt: now,
    description:
      "درخواست خرید ثبت شد. این سفارش فقط در پنل ادمین لاگ می‌شود و پرداخت آنلاین ندارد.",
  };
  const current = readUserTransactions();
  writeUserTransactions([transaction, ...current]);
  return { ...transaction };
}

export function createSellTransaction(input: {
  assetSymbol: string;
  assetTitle: string;
  quantity: number;
  unit: string;
  unitPriceToman: number;
  totalToman: number;
}): Transaction {
  const now = new Date().toISOString();
  const id = `tx-user-${Date.now()}`;
  const trackingCode = `SHG-${Math.floor(1000000 + Math.random() * 9000000)}`;
  const transaction: Transaction = {
    id,
    trackingCode,
    type: "sell",
    assetSymbol: input.assetSymbol,
    assetTitle: input.assetTitle,
    quantity: input.quantity,
    unit: input.unit,
    unitPrice: Math.round(input.unitPriceToman * 10),
    total: Math.round(input.totalToman * 10),
    status: "pending",
    createdAt: now,
    updatedAt: now,
    description:
      "درخواست فروش ثبت شد. این سفارش فقط در پنل ادمین لاگ می‌شود و پرداخت آنلاین ندارد.",
  };
  const current = readUserTransactions();
  writeUserTransactions([transaction, ...current]);
  return { ...transaction };
}

export function getTransactions(): Transaction[] {
  return [...readUserTransactions(), ...MOCK_TRANSACTIONS].map((t) => ({ ...t }));
}

export function getTransaction(id: string): Transaction | undefined {
  const t = getTransactions().find((x) => x.id === id || x.trackingCode === id.toUpperCase());
  return t ? { ...t } : undefined;
}

export const TRANSACTION_STATUS_LABELS: Record<Transaction["status"], string> = {
  pending: "در انتظار بررسی",
  approved: "تأییدشده",
  completed: "تکمیل‌شده",
  rejected: "ردشده",
  canceled: "لغوشده",
};

export const TRANSACTION_TYPE_LABELS: Record<Transaction["type"], string> = {
  buy: "خرید",
  sell: "فروش",
};
