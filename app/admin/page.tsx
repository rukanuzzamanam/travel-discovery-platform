import { Card, RangeTabs, Stat, parseDays } from "@/components/admin/admin-ui";
import { Bars, TimeSeries } from "@/components/admin/charts";
import { clicksOverTime, overview, rangeFromDays, revenueBy, topDestinations, trafficOverTime } from "@/lib/admin/stats";
import { formatUsd } from "@/lib/utils/format";

export default async function AdminHome({ searchParams }: PageProps<"/admin">) {
  const days = parseDays((await searchParams).days);
  const r = rangeFromDays(days);
  const [o, traffic, clicks, byDest, byProvider, byPage, top] = await Promise.all([
    overview(r),
    trafficOverTime(r),
    clicksOverTime(r),
    revenueBy("destination", r),
    revenueBy("provider", r),
    revenueBy("page", r),
    topDestinations(r),
  ]);
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <RangeTabs base="/admin" days={days} />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <Stat label="Visitors" value={o.visitors} note="unique sessions" />
        <Stat label="Searches" value={o.searches} />
        <Stat label="Trips created" value={o.trips} />
        <Stat label="Affiliate clicks" value={o.clicks} />
        <Stat label="Conversion rate" value={`${o.conversionRate}%`} note="conversions / clicks" />
        <Stat label="Estimated revenue" value={formatUsd(o.revenue)} note="USD, excl. rejected" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Traffic over time (page views)"><TimeSeries data={traffic} label="Page views" /></Card>
        <Card title="Affiliate clicks"><TimeSeries data={clicks} label="Clicks" color="accent" /></Card>
        <Card title="Revenue by destination"><Bars money label="Revenue by destination" valueLabel="Revenue" data={byDest.map((x) => ({ key: x.key, value: x.revenue }))} /></Card>
        <Card title="Revenue by provider"><Bars money label="Revenue by provider" valueLabel="Revenue" data={byProvider.map((x) => ({ key: x.key, value: x.revenue }))} /></Card>
        <Card title="Revenue by source page"><Bars money label="Revenue by page" valueLabel="Revenue" data={byPage.map((x) => ({ key: x.key, value: x.revenue }))} /></Card>
        <Card title="Top destinations (views)"><Bars label="Top destinations" valueLabel="Views" data={top.map((x) => ({ key: x.key, value: x.n }))} /></Card>
      </div>
    </>
  );
}
