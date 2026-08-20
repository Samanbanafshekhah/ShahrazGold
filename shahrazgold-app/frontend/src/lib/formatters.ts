const FA_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];

export function toPersianDigits(input: string | number): string {
  return String(input).replace(/[0-9]/g, (d) => FA_DIGITS[Number(d)]);
}

export function formatNumber(n: number, fractionDigits = 0): string {
  const s = n.toLocaleString("en-US", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
  return toPersianDigits(s);
}

export function formatRial(n: number): string {
  return `${formatNumber(Math.round(n))} ریال`;
}

export function formatToman(n: number): string {
  return `${formatNumber(Math.round(n / 10))} تومان`;
}

export function formatUsd(n: number): string {
  return `${formatNumber(n, 2)} دلار`;
}

export function formatMoney(n: number, currency: "IRR" | "USD"): string {
  return currency === "USD" ? formatUsd(n) : formatRial(n);
}

export function formatPercent(n: number, fractionDigits = 2): string {
  const sign = n > 0 ? "+" : n < 0 ? "-" : "";
  return `${sign}${formatNumber(Math.abs(n), fractionDigits)}٪`;
}

export function formatSignedNumber(n: number): string {
  const sign = n > 0 ? "+" : n < 0 ? "-" : "";
  return `${sign}${formatNumber(Math.abs(n))}`;
}

export function formatWeight(grams: number): string {
  return `${formatNumber(grams, grams < 10 ? 3 : 2)} گرم`;
}

export function formatCoinCount(n: number): string {
  return `${formatNumber(n)} عدد`;
}

const PERSIAN_MONTHS = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند",
];

function toJalali(gy: number, gm: number, gd: number): [number, number, number] {
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  const gy2 = gm > 2 ? gy + 1 : gy;
  let days =
    355666 +
    365 * gy +
    Math.floor((gy2 + 3) / 4) -
    Math.floor((gy2 + 99) / 100) +
    Math.floor((gy2 + 399) / 400) +
    gd +
    g_d_m[gm - 1];
  let jy = -1595 + 33 * Math.floor(days / 12053);
  days %= 12053;
  jy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    jy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  const jm = days < 186 ? 1 + Math.floor(days / 31) : 7 + Math.floor((days - 186) / 30);
  const jd = 1 + (days < 186 ? days % 31 : (days - 186) % 30);
  return [jy, jm, jd];
}

export function formatPersianDate(input: string | Date = new Date()): string {
  const d = typeof input === "string" ? new Date(input) : input;
  const [jy, jm, jd] = toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
  return `${toPersianDigits(jd)} ${PERSIAN_MONTHS[jm - 1]} ${toPersianDigits(jy)}`;
}

export function formatPersianDateLong(input: string | Date = new Date()): string {
  const d = typeof input === "string" ? new Date(input) : input;
  const weekdays = ["یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنج‌شنبه", "جمعه", "شنبه"];
  const wd = weekdays[d.getDay()];
  return `${wd}، ${formatPersianDate(d)}`;
}

export function formatPersianTime(input: string | Date = new Date()): string {
  const d = typeof input === "string" ? new Date(input) : input;
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return toPersianDigits(`${h}:${m}`);
}

export function formatRelativeMinutes(input: string | Date): string {
  const d = typeof input === "string" ? new Date(input) : input;
  const diffMs = Date.now() - d.getTime();
  const mins = Math.max(0, Math.floor(diffMs / 60000));
  if (mins < 1) return "همین لحظه";
  if (mins < 60) return `${toPersianDigits(mins)} دقیقه پیش`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${toPersianDigits(hours)} ساعت پیش`;
  const days = Math.floor(hours / 24);
  return `${toPersianDigits(days)} روز پیش`;
}