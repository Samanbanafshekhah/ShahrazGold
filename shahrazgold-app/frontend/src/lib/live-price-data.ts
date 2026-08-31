export type LivePriceCategory = "all" | "gold" | "coin" | "melted" | "currency" | "silver";

export interface LivePriceAsset {
  id: string;
  productId?: number;
  unit?: string;
  updatedAt?: string;
  amountDivisor?: number;
  finalAmountMultiplier?: number;
  buyDisabled?: boolean;
  sellDisabled?: boolean;
  name: string;
  symbol?: string;
  category: Exclude<LivePriceCategory, "all">;
  currentPrice: number;
  buyPrice: number;
  dailyChange: number;
  icon: string;
}

export const priceCategories: { key: LivePriceCategory; label: string }[] = [
  { key: "all", label: "همه" },
  { key: "gold", label: "طلا" },
  { key: "coin", label: "سکه" },
  { key: "melted", label: "طلای آب‌شده" },
  { key: "currency", label: "ارز" },
  { key: "silver", label: "نقره" },
];

export function getLivePriceAssets(): LivePriceAsset[] {
  return LIVE_PRICE_ASSETS.map((asset) => ({ ...asset }));
}

const LIVE_PRICE_ASSETS: LivePriceAsset[] = [
  {
    id: "gold-18",
    name: "طلای ۱۸ عیار",
    symbol: "GOLD18",
    category: "gold",
    currentPrice: 7_786_000,
    buyPrice: 7_762_000,
    dailyChange: 0.31,
    icon: "۱۸",
  },
  {
    id: "gold-24",
    name: "طلای ۲۴ عیار",
    symbol: "GOLD24",
    category: "gold",
    currentPrice: 10_381_000,
    buyPrice: 10_348_000,
    dailyChange: 0.3,
    icon: "۲۴",
  },
  {
    id: "mithqal",
    name: "مثقال طلا",
    symbol: "MITHQAL",
    category: "gold",
    currentPrice: 33_725_000,
    buyPrice: 33_610_000,
    dailyChange: -0.12,
    icon: "مث",
  },
  {
    id: "melted-gold",
    name: "طلای آب‌شده",
    symbol: "MELTED",
    category: "melted",
    currentPrice: 33_940_000,
    buyPrice: 33_820_000,
    dailyChange: 0.18,
    icon: "آب",
  },
  {
    id: "emami",
    name: "سکه امامی",
    symbol: "EMAMI",
    category: "coin",
    currentPrice: 181_050_000,
    buyPrice: 180_500_000,
    dailyChange: 0.25,
    icon: "سک",
  },
  {
    id: "bahar",
    name: "سکه بهار آزادی",
    symbol: "BAHAR",
    category: "coin",
    currentPrice: 177_000_000,
    buyPrice: 176_500_000,
    dailyChange: 0,
    icon: "به",
  },
  {
    id: "half-coin",
    name: "نیم سکه",
    symbol: "HALF",
    category: "coin",
    currentPrice: 94_700_000,
    buyPrice: 94_250_000,
    dailyChange: -0.21,
    icon: "نیم",
  },
  {
    id: "quarter-coin",
    name: "ربع سکه",
    symbol: "QUARTER",
    category: "coin",
    currentPrice: 54_000_000,
    buyPrice: 53_750_000,
    dailyChange: 0.22,
    icon: "ربع",
  },
  {
    id: "gram-coin",
    name: "سکه گرمی",
    symbol: "GRAM",
    category: "coin",
    currentPrice: 26_500_000,
    buyPrice: 26_350_000,
    dailyChange: -0.11,
    icon: "گر",
  },
  {
    id: "silver-999",
    name: "نقره ۹۹۹",
    symbol: "SILVER",
    category: "silver",
    currentPrice: 138_500,
    buyPrice: 136_900,
    dailyChange: 0.08,
    icon: "نق",
  },
  {
    id: "usd-free",
    name: "دلار آزاد",
    symbol: "USD",
    category: "currency",
    currentPrice: 70_500,
    buyPrice: 70_250,
    dailyChange: -0.16,
    icon: "$",
  },
];
