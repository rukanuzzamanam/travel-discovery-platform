import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { DestinationRail } from "@/components/destination/destination-rail";
import { buildMetadata } from "@/lib/seo/metadata";
import { BUDGET_PAGES } from "@/lib/seo/programmatic";
import { discover } from "@/lib/travel/discover";
import { DEFAULT_ORIGIN } from "@/lib/site";
import { formatCurrency } from "@/lib/currency";

export const revalidate = 3600;

export function generateStaticParams() {
  return BUDGET_PAGES.map((a) => ({ amount: String(a) }));
}

const parse = (s: string) => (BUDGET_PAGES as readonly number[]).find((b) => String(b) === s);

export async function generateMetadata({ params }: PageProps<"/travel-budget/[amount]">): Promise<Metadata> {
  const a = parse((await params).amount);
  if (!a) return {};
  return buildMetadata({
    title: `Where can I travel for ${formatCurrency(a, "USD")}? Trip ideas and costs`,
    description: `Destinations you can visit for about ${formatCurrency(a, "USD")} in total, with estimated flights, hotel, food and activity costs.`,
    path: `/travel-budget/${a}`,
  });
}

export default async function BudgetPage({ params }: PageProps<"/travel-budget/[amount]">) {
  const amount = parse((await params).amount);
  if (!amount) notFound();
  const res = await discover({ origin: DEFAULT_ORIGIN, budget: amount, nights: 5, travellers: 1, interests: [], style: "BUDGET" }, 12);
  const fits = res.items.filter((i) => i.withinBudget);
  if (fits.length < 2) notFound();
  return (
    <div className="mx-auto max-w-7xl space-y-10 px-4 py-10 sm:px-6 lg:px-8">
      <div>
        <Breadcrumbs items={[{ name: "Home", path: "/" }, { name: `${formatCurrency(amount, "USD")} trips`, path: `/travel-budget/${amount}` }]} />
        <h1 className="mt-4 text-3xl font-bold sm:text-4xl">Where can I go for {formatCurrency(amount, "USD")}?</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Estimated total for one traveller, five nights, budget style, flying from Sydney. <Link className="text-primary underline" href={`/discover?origin=${DEFAULT_ORIGIN}&budget=${amount}&nights=5&travellers=1&style=BUDGET`}>Change your city, dates and interests</Link>.
        </p>
      </div>
      <DestinationRail id="fits" title={`Trips within ${formatCurrency(amount, "USD")}`} items={fits.slice(0, 8).map((i) => ({ destination: i, fromUsd: i.cost.total, fromLabel: "Total" }))} />
      <nav aria-label="Other budgets" className="flex flex-wrap gap-2">
        {BUDGET_PAGES.filter((b) => b !== amount).map((b) => (
          <Link key={b} href={`/travel-budget/${b}`} className="rounded-full border px-4 py-2 text-sm font-medium hover:bg-muted">
            {formatCurrency(b, "USD")}
          </Link>
        ))}
      </nav>
    </div>
  );
}
