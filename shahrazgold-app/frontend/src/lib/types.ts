export type AssetCategory = "melted" | "gold" | "coin";

export interface GoldAsset {
    productId?: number;
    priceId?: number;
    priceVersion?: number;
    priceAdjustmentVersion?: number;
    symbol: string;
    title: string;
    category: AssetCategory;
    unit: string; // e.g. "گرم", "عدد", "مثقال", "اونس"
    price: number; // in rials, or in usd for ounce
    currency: "IRR" | "USD";
    buy?: number;
    sell?: number;
    available?: boolean;
    change: number; // absolute change today
    changePercent: number; // percent change today
    high: number;
    low: number;
    open: number;
    updatedAt: string; // ISO
    rawPrice?: number;
    buyPriceAdjustment?: number;
    sellPriceAdjustment?: number;
    sellPriceDifference?: number;
    tradeAmountDivisor?: number;
    finalAmountMultiplier?: number;
    buyDisabled?: boolean;
    sellDisabled?: boolean;
}

export type TransactionType = "buy" | "sell";
export type TransactionStatus = "pending" | "approved" | "completed" | "rejected" | "canceled";

export interface Transaction {
    id: string;
    trackingCode: string;
    type: TransactionType;
    assetSymbol: string;
    assetTitle: string;
    quantity: number; // grams or count
    unit: string;
    unitPrice: number;
    total: number;
    status: TransactionStatus;
    createdAt: string;
    updatedAt: string;
    description?: string;
}

export interface User {
    id: string;
    firstName: string;
    lastName: string;
    mobile: string;
    email?: string;
    avatarUrl?: string;
    verified: boolean;
    createdAt: string;
    role?: "customer" | "admin";
    roleId?: number;
    isActive?: boolean;
    canReorderProducts?: boolean;
}
