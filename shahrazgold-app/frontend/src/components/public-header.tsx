import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Brand } from "./brand";
import { Menu, X } from "lucide-react";
import { useState } from "react";

const NAV = [
  { label: "خانه", to: "/" as const, hash: undefined },
  { label: "خدمات", to: "/" as const, hash: "features" },
  { label: "قیمت‌ها", to: "/" as const, hash: "prices" },
  { label: "تماس با ما", to: "/" as const, hash: "contact" },
];

export function PublicHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-6">
        <Brand />
        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((n) => (
            <a
              key={n.label}
              href={n.hash ? `#${n.hash}` : "/"}
              className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {n.label}
            </a>
          ))}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          <Button asChild variant="ghost" size="sm">
            <Link to="/login">ورود</Link>
          </Button>
        </div>
        <button
          type="button"
          aria-label="باز کردن منو"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-border md:hidden"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      {open && (
        <div className="border-t border-border bg-background md:hidden">
          <div className="flex flex-col gap-1 p-3">
            {NAV.map((n) => (
              <a
                key={n.label}
                href={n.hash ? `#${n.hash}` : "/"}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-3 text-sm hover:bg-muted"
              >
                {n.label}
              </a>
            ))}
            <div className="mt-2 grid grid-cols-1 gap-2">
              <Button asChild variant="outline">
                <Link to="/login" onClick={() => setOpen(false)}>
                  ورود
                </Link>
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
