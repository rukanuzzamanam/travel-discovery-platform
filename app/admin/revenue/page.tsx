import { Card, RangeTabs, Table, parseDays } from "@/components/admin/admin-ui";
import { Bars } from "@/components/admin/charts";
import { ConversionForm } from "@/components/admin/conversion-form";
import { db } from "@/lib/db/client";
import { rangeFromDays, revenueBy } from "@/lib/admin/stats";
import { formatUsd } from "@/lib/utils/format";

export default async function AdminRevenue({ searchParams }: PageProps<"/admin/revenue">) {
  const days = parseDays((await searchParams).days);
  const r = rangeFromDays(days);
  const [byPage, byDest, byProvider, recent] = await Promise.all([
    revenueBy("page", r),
    revenueBy("destination", r),
    revenueBy("provider", r),
    db.conversion.findMany({ orderBy: { createdAt: "desc" }, take: 25, include: { click: { select: { sourcePage: true, subId: true } } } }),
  ]);
  const rows = (x: { key: string; clicks: number; revenue: number }[]) => x.map((i) => [i.key, i.clicks, formatUsd(i.revenue), i.clicks ? formatUsd(i.revenue / i.clicks) : "–"]);
  const head = ["Key", "Clicks", "Revenue", "Per click"];
  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Revenue attribution</h1>
        <RangeTabs base="/admin/revenue" days={days} />
      </div>
      <p className="text-sm text-muted-foreground">
        Page → click → provider → conversion → commission. Commission appears here once you record conversions (match the partner report&apos;s sub id to a click below). USD only; rejected conversions excluded.
      </p>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Revenue by source page"><Bars money label="Revenue by page" valueLabel="Revenue" data={byPage.map((x) => ({ key: x.key, value: x.revenue }))} /></Card>
        <Card title="Revenue by destination"><Bars money label="Revenue by destination" valueLabel="Revenue" data={byDest.map((x) => ({ key: x.key, value: x.revenue }))} /></Card>
      </div>
      <h2 className="font-semibold">Pages</h2>
      <Table head={head} rows={rows(byPage)} />
      <h2 className="font-semibold">Destinations</h2>
      <Table head={head} rows={rows(byDest)} />
      <h2 className="font-semibold">Providers</h2>
      <Table head={head} rows={rows(byProvider)} />
      <Card title="Record a conversion">
        <ConversionForm />
      </Card>
      <h2 className="font-semibold">Recent conversions</h2>
      <Table
        head={["Date", "Provider", "Type", "Commission", "Status", "Source page", "Booking ref"]}
        rows={recent.map((c) => [c.createdAt.toISOString().slice(0, 10), c.provider, c.productType, c.commission ? `${c.commission} ${c.currency}` : "pending", c.status, c.click?.sourcePage ?? "–", c.bookingReference ?? "–"])}
      />
    </>
  );
}
