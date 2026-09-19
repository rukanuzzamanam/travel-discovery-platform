import { db } from "@/lib/db/client";
import { Money } from "@/components/currency/currency-provider";
import { getCurrentUser } from "@/lib/auth/session";
import { getAirports, getDestinations } from "@/lib/travel/repository";
import { LogoutButton, PreferencesForm, PriceAlertForm, RemoveButton } from "@/components/layout/account-panels";
import { parseCurrency } from "@/lib/currency";
import Link from "next/link";

export default async function AccountPage() {
  const user = (await getCurrentUser())!;
  const [airports, destinations, prefs, saved, alerts] = await Promise.all([
    getAirports(),
    getDestinations(),
    db.userPreference.findUnique({ where: { userId: user.id } }),
    db.savedDestination.findMany({ where: { userId: user.id }, include: { destination: { select: { slug: true, name: true } } } }),
    db.priceAlert.findMany({ where: { userId: user.id, active: true }, include: { destination: { select: { slug: true, name: true } } } }),
  ]);
  const ap = airports.map((a) => ({ iata: a.iata, city: a.city }));
  return (
    <div className="space-y-12">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Your account</h1>
          <p className="text-muted-foreground">{user.email}</p>
        </div>
        <LogoutButton />
      </header>

      <section aria-labelledby="prefs">
        <h2 id="prefs" className="mb-4 text-xl font-bold">Preferences</h2>
        <PreferencesForm airports={ap} initial={{ homeAirport: prefs?.homeAirport ?? null, travelStyle: prefs?.travelStyle ?? "MID_RANGE", interests: prefs?.interests ?? [], emailAlerts: prefs?.emailAlerts ?? false, currency: parseCurrency(prefs?.currency) }} />
      </section>

      <section aria-labelledby="saved">
        <h2 id="saved" className="mb-4 text-xl font-bold">Saved destinations</h2>
        {saved.length === 0 ? (
          <p className="text-muted-foreground">Nothing saved yet. Use &ldquo;Save destination&rdquo; on any <Link className="text-primary underline" href="/destinations">destination page</Link>.</p>
        ) : (
          <ul className="divide-y rounded-xl border">
            {saved.map((s) => (
              <li key={s.id} className="flex items-center justify-between p-3">
                <Link href={`/destinations/${s.destination.slug}`} className="font-medium hover:underline">{s.destination.name}</Link>
                <RemoveButton url="/api/v1/account/saved-destinations" body={{ slug: s.destination.slug }} label={`Remove ${s.destination.name}`} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="alerts">
        <h2 id="alerts" className="mb-4 text-xl font-bold">Price alerts</h2>
        <PriceAlertForm airports={ap} destinations={destinations.map((d) => ({ slug: d.slug, name: d.name }))} />
        <ul className="mt-4 divide-y rounded-xl border">
          {alerts.map((a) => (
            <li key={a.id} className="flex items-center justify-between p-3 text-sm">
              <span>{a.origin} → {a.destination.name} under <Money usd={a.maxPriceUsd} /></span>
              <RemoveButton url="/api/v1/account/price-alerts" body={{ id: a.id }} label="Remove alert" />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
