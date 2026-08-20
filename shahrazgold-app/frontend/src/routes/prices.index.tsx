import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { GoldPricePage } from "@/components/live-prices";

export const Route = createFileRoute("/prices/")({
  component: PricesPage,
  head: () => ({ meta: [{ title: "قیمت لحظه‌ای طلا و سکه | شهراز‌گلد" }] }),
});

function PricesPage() {
  return (
    <AppShell>
      <GoldPricePage />
    </AppShell>
  );
}
