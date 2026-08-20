import { Link } from "@tanstack/react-router";

export function BrandMark({ size = 36 }: { size?: number }) {
  return (
    <span
      aria-hidden
      className="relative inline-flex shrink-0 overflow-hidden rounded-full bg-white shadow-elegant"
      style={{ width: size, height: size }}
    >
      <img
        src="/ShahrazGoldLogo2.png"
        alt=""
        className="h-full w-full select-none object-cover"
        draggable={false}
      />
    </span>
  );
}

export function Brand({ to = "/" as string }: { to?: string }) {
  return (
    <Link to={to} className="flex items-center gap-2.5 group">
      <BrandMark />
      <span className="flex flex-col leading-tight">
        <span className="text-base font-extrabold">شهراز‌گلد</span>
        <span className="text-[10px] text-muted-foreground">ShahrazGold</span>
      </span>
    </Link>
  );
}
