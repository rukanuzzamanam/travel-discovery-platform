import { Card, RangeTabs, Table, parseDays } from "@/components/admin/admin-ui";
import { TimeSeries } from "@/components/admin/charts";
import { funnel, rangeFromDays, trafficOverTime } from "@/lib/admin/stats";

export default async function AdminAnalytics({ searchParams }: PageProps<"/admin/analytics">) {
  const days = parseDays((await searchParams).days);
  const r = rangeFromDays(days);
  const [events, traffic] = await Promise.all([funnel(r), trafficOverTime(r)]);
  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Analytics</h1>
        <RangeTabs base="/admin/analytics" days={days} />
      </div>
      <Card title="Page views"><TimeSeries data={traffic} label="Page views" /></Card>
      <h2 className="font-semibold">Events</h2>
      <Table head={["Event", "Count"]} rows={events.map((e) => [e.name, e.count])} />
    </>
  );
}
