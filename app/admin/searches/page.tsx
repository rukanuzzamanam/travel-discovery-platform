import { db } from "@/lib/db/client";
import { Table } from "@/components/admin/admin-ui";
import { formatCurrency } from "@/lib/currency";

export default async function AdminSearches() {
  const searches = await db.search.findMany({ orderBy: { createdAt: "desc" }, take: 100, include: { results: { orderBy: { rank: "asc" }, take: 1, include: { destination: { select: { name: true } } } } } });
  return (
    <>
      <h1 className="text-2xl font-bold">Searches</h1>
      <Table
        head={["When", "Kind", "Origin", "Budget", "Nights", "Travellers", "Interests", "Results", "Top result"]}
        rows={searches.map((s) => [
          s.createdAt.toISOString().slice(0, 16).replace("T", " "),
          s.kind,
          s.origin ?? "–",
          s.budgetUsd ? formatCurrency(s.budgetUsd, "USD") : "–",
          s.nights ?? "–",
          s.travellers ?? "–",
          s.interests.join(", ").toLowerCase() || "–",
          s.resultCount,
          s.results[0]?.destination.name ?? "–",
        ])}
      />
    </>
  );
}
