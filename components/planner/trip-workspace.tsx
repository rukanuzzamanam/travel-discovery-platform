"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Bookmark, Plus, Send, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CostBreakdownList } from "@/components/travel/cost-breakdown";
import { EstimateBadge } from "@/components/travel/estimate-badge";
import { formatUsd } from "@/lib/utils/format";
import type { CostBreakdown, ItineraryDay, ItineraryItem } from "@/lib/travel/types";
import { cn } from "@/lib/utils";

type Props = {
  token: string;
  initialDays: ItineraryDay[];
  initialTotals: CostBreakdown;
  travellers: number;
  budget?: number;
  style: string;
  readOnly?: boolean;
};

const QUICK = [
  { label: "Make it $300 cheaper", body: { operation: "reduceTripCost", amountUsd: 300 } },
  { label: "Upgrade the trip", body: { operation: "upgradeTrip" } },
  { label: "Family-friendly", body: { operation: "makeFamilyFriendly" } },
  { label: "Add beach time", body: { operation: "addBeachActivities" } },
  { label: "Drop pricey activities", body: { operation: "removeExpensiveActivities" } },
  { label: "Shorten by a day", body: { operation: "shortenTrip", days: 1 } },
  { label: "Add a day", body: { operation: "extendTrip", days: 1 } },
] as const;

export function TripWorkspace({ token, initialDays, initialTotals, travellers, budget, style: initialStyle, readOnly }: Props) {
  const router = useRouter();
  const [days, setDays] = useState(initialDays);
  const [totals, setTotals] = useState(initialTotals);
  const [style, setStyle] = useState(initialStyle);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [log, setLog] = useState<{ reply: string; changes: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  async function call(url: string, init: RequestInit) {
    const res = await fetch(url, { headers: { "Content-Type": "application/json" }, ...init });
    const json = await res.json();
    if (!json.success) throw new Error(json.error?.message ?? "Something went wrong");
    return json.data;
  }

  async function save() {
    const data = await call(`/api/v1/trips/${token}`, { method: "PUT", body: JSON.stringify({ days, style }) });
    setDays(data.state.days);
    setTotals(data.totals);
    setDirty(false);
  }

  async function run<T>(fn: () => Promise<T>) {
    setBusy(true);
    setError(null);
    try {
      return await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const ask = (body: Record<string, unknown>) =>
    run(async () => {
      if (dirty) await save();
      const data = await call("/api/v1/itinerary", { method: "POST", body: JSON.stringify({ token, ...body }) });
      setDays(data.state.days);
      setTotals(data.totals);
      setStyle(data.state.style);
      setLog({ reply: data.reply, changes: data.changes });
    });

  const edit = (fn: (d: ItineraryDay[]) => ItineraryDay[]) => {
    setDays((d) => fn(structuredClone(d)));
    setDirty(true);
  };
  const updateItem = (di: number, ii: number, patch: Partial<ItineraryItem>) =>
    edit((d) => {
      d[di].items[ii] = { ...d[di].items[ii], ...patch };
      return d;
    });

  async function claim() {
    setSaved(null);
    const res = await fetch(`/api/v1/trips/${token}/claim`, { method: "POST" });
    if (res.status === 401) {
      router.push(`/login?next=${encodeURIComponent(`/trips/${token}`)}`);
      return;
    }
    const json = await res.json();
    setSaved(json.success ? "Saved to your account" : (json.error?.message ?? "Could not save"));
  }

  const over = budget !== undefined && totals.total > budget;

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="space-y-6">
        {days.map((day, di) => (
          <section key={`${day.day}-${day.title}`} className="rounded-2xl border bg-card p-5" aria-labelledby={`day-${di}`}>
            <h3 id={`day-${di}`} className="text-lg font-semibold">
              Day {day.day}: {day.title}
            </h3>
            <ul className="mt-3 divide-y">
              {day.items.map((item, ii) => (
                <li key={`${item.title}-${ii}`} className="flex flex-wrap items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    {readOnly ? (
                      <p className="font-medium">{item.title}</p>
                    ) : (
                      <Input aria-label="Item title" value={item.title} onChange={(e) => updateItem(di, ii, { title: e.target.value })} className="h-9" />
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {item.category}
                      {item.durationMin ? ` · ~${Math.round((item.durationMin / 60) * 10) / 10}h` : ""}
                      {item.notes ? ` · ${item.notes}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {readOnly ? (
                      <span className="text-sm font-medium tabular-nums">{item.costUsd === 0 ? "Free" : formatUsd(item.costUsd)}</span>
                    ) : (
                      <Input
                        aria-label={`Cost per person for ${item.title} in USD`}
                        type="number"
                        min={0}
                        value={item.costUsd}
                        onChange={(e) => updateItem(di, ii, { costUsd: Math.max(0, Number(e.target.value) || 0), priceKind: "USER" })}
                        className="h-9 w-24"
                      />
                    )}
                    <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", item.priceKind === "USER" ? "bg-amber-100 text-amber-900" : "bg-secondary")}>
                      {item.priceKind === "USER" ? "Your price" : "Estimate"}
                    </span>
                  </div>
                  {!readOnly && (
                    <div className="flex">
                      <Button type="button" variant="ghost" size="icon" aria-label="Move up" disabled={ii === 0} onClick={() => edit((d) => { [d[di].items[ii - 1], d[di].items[ii]] = [d[di].items[ii], d[di].items[ii - 1]]; return d; })}>
                        <ArrowUp />
                      </Button>
                      <Button type="button" variant="ghost" size="icon" aria-label="Move down" disabled={ii === day.items.length - 1} onClick={() => edit((d) => { [d[di].items[ii + 1], d[di].items[ii]] = [d[di].items[ii], d[di].items[ii + 1]]; return d; })}>
                        <ArrowDown />
                      </Button>
                      <Button type="button" variant="ghost" size="icon" aria-label={`Remove ${item.title}`} onClick={() => edit((d) => { d[di].items.splice(ii, 1); return d; })}>
                        <Trash2 />
                      </Button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
            {!readOnly && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => edit((d) => { d[di].items.push({ title: "New activity", category: "activity", costUsd: 0, priceKind: "USER" }); return d; })}
              >
                <Plus /> Add item
              </Button>
            )}
          </section>
        ))}
      </div>

      <aside className="space-y-6 lg:sticky lg:top-20 lg:self-start" aria-label="Trip summary and assistant">
        <div className="rounded-2xl border bg-card p-5">
          <CostBreakdownList cost={totals} />
          <p className="mt-2 text-xs text-muted-foreground">
            {travellers} traveller{travellers === 1 ? "" : "s"} · {style.replace("_", "-").toLowerCase()} style. Activity costs come from the itinerary; you can override any price.
          </p>
          {budget !== undefined && (
            <p className={cn("mt-2 text-sm font-medium", over ? "text-amber-700" : "text-emerald-700")}>
              {over ? `${formatUsd(totals.total - budget)} over` : `${formatUsd(budget - totals.total)} under`} your {formatUsd(budget)} budget
            </p>
          )}
          {!readOnly && (
            <div className="mt-4 flex flex-wrap gap-2">
              <Button type="button" onClick={() => run(save)} disabled={!dirty || busy}>
                {dirty ? "Save changes" : "Saved"}
              </Button>
              <Button type="button" variant="outline" onClick={claim}>
                <Bookmark /> Save trip
              </Button>
            </div>
          )}
          {dirty && <p className="mt-2 text-xs text-amber-700">Unsaved changes. Save to update the estimate.</p>}
          {saved && (
            <p role="status" className="mt-2 text-sm">
              {saved}
            </p>
          )}
        </div>

        {!readOnly && (
          <div className="rounded-2xl border bg-secondary/40 p-5">
            <h2 className="flex items-center gap-2 font-semibold">
              <Sparkles className="size-4 text-primary" aria-hidden /> Trip assistant
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">Edits use your trip&apos;s own activity data. It can&apos;t make up prices.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {QUICK.map((q) => (
                <button key={q.label} type="button" disabled={busy} onClick={() => ask(q.body)} className="rounded-full border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-50">
                  {q.label}
                </button>
              ))}
            </div>
            <form
              className="mt-3 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (message.trim().length < 2) return;
                ask({ message }).then(() => setMessage(""));
              }}
            >
              <Input aria-label="Ask the trip assistant" placeholder="e.g. Make this trip $300 cheaper" value={message} onChange={(e) => setMessage(e.target.value)} maxLength={400} className="h-10" />
              <Button type="submit" size="icon-lg" disabled={busy} aria-label="Send">
                <Send />
              </Button>
            </form>
            <div aria-live="polite" className="mt-3 text-sm">
              {busy && <p className="text-muted-foreground">Working…</p>}
              {error && (
                <p role="alert" className="text-destructive">
                  {error}
                </p>
              )}
              {log && !busy && (
                <div>
                  <p>{log.reply}</p>
                  {log.changes.length > 0 && (
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
                      {log.changes.map((c) => (
                        <li key={c}>{c}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
            <EstimateBadge className="mt-3" label="All prices are estimates" />
          </div>
        )}
      </aside>
    </div>
  );
}
