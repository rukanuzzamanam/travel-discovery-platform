import { db } from "@/lib/db/client";
import { Table } from "@/components/admin/admin-ui";

export default async function AdminClicks() {
  const clicks = await db.affiliateClick.findMany({ orderBy: { createdAt: "desc" }, take: 200, include: { destination: { select: { name: true } }, conversions: { select: { status: true } } } });
  return (
    <>
      <h1 className="text-2xl font-bold">Affiliate clicks</h1>
      <Table
        head={["When", "Provider", "Product", "Destination", "Source page", "Component", "Sub id", "Conversion"]}
        rows={clicks.map((c) => [
          c.createdAt.toISOString().slice(0, 16).replace("T", " "),
          c.provider,
          c.productType,
          c.destination?.name ?? "–",
          c.sourcePage,
          c.sourceComponent ?? "–",
          <code key="s" className="text-xs">{c.subId}</code>,
          c.conversions[0]?.status ?? "–",
        ])}
      />
    </>
  );
}
