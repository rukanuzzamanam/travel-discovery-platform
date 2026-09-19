import Link from "next/link";
import { Money } from "@/components/currency/currency-provider";
import { db } from "@/lib/db/client";
import { getCurrentUser } from "@/lib/auth/session";

export default async function SavedTripsPage() {
  const user = (await getCurrentUser())!;
  const trips = await db.trip.findMany({ where: { userId: user.id }, orderBy: { updatedAt: "desc" }, include: { destination: { select: { name: true } } } });
  return (
    <div>
      <h1 className="text-3xl font-bold">Saved trips</h1>
      {trips.length === 0 ? (
        <p className="mt-4 text-muted-foreground">
          No saved trips yet. <Link href="/trip-planner" className="text-primary underline">Plan one</Link>.
        </p>
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2">
          {trips.map((t) => (
            <li key={t.id}>
              <Link href={`/trips/${t.shareToken}`} className="block rounded-2xl border bg-card p-5 hover:shadow-md">
                <p className="font-semibold">{t.title}</p>
                <p className="text-sm text-muted-foreground">{t.startDate.toISOString().slice(0, 10)} · {t.travellers} travellers</p>
                <p className="mt-2 text-lg font-bold"><Money usd={t.totalEstimateUsd} /> <span className="text-xs font-normal text-muted-foreground">estimated</span></p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
