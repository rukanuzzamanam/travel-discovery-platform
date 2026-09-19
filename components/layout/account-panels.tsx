"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { INTERESTS, INTEREST_LABELS } from "@/lib/travel/interests";

async function api(url: string, method: string, body?: unknown) {
  const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  return res.json();
}

export function LogoutButton() {
  const router = useRouter();
  return (
    <Button
      variant="outline"
      onClick={async () => {
        await api("/api/v1/auth/logout", "POST");
        router.push("/");
        router.refresh();
      }}
    >
      Sign out
    </Button>
  );
}

export function PreferencesForm({
  airports,
  initial,
}: {
  airports: { iata: string; city: string }[];
  initial: { homeAirport: string | null; travelStyle: string; interests: string[]; emailAlerts: boolean };
}) {
  const [msg, setMsg] = useState<string | null>(null);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const json = await api("/api/v1/account/preferences", "PUT", {
      homeAirport: (f.get("homeAirport") as string) || null,
      travelStyle: f.get("travelStyle"),
      interests: f.getAll("interests"),
      emailAlerts: f.get("emailAlerts") === "on",
    });
    setMsg(json.success ? "Preferences saved" : (json.error?.message ?? "Could not save"));
  }
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="pref-home">Home airport</Label>
          <NativeSelect id="pref-home" name="homeAirport" defaultValue={initial.homeAirport ?? ""}>
            <option value="">Not set</option>
            {airports.map((a) => (
              <option key={a.iata} value={a.iata}>
                {a.city} ({a.iata})
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pref-style">Travel style</Label>
          <NativeSelect id="pref-style" name="travelStyle" defaultValue={initial.travelStyle}>
            <option value="BUDGET">Budget</option>
            <option value="MID_RANGE">Mid-range</option>
            <option value="LUXURY">Luxury</option>
          </NativeSelect>
        </div>
      </div>
      <fieldset>
        <legend className="mb-2 text-sm font-medium">Interests</legend>
        <div className="flex flex-wrap gap-2">
          {INTERESTS.map((i) => (
            <label key={i} className="cursor-pointer">
              <input type="checkbox" name="interests" value={i.toUpperCase()} defaultChecked={initial.interests.includes(i.toUpperCase())} className="peer sr-only" />
              <span className="inline-flex min-h-10 items-center rounded-full border px-4 text-sm font-medium peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-foreground peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50">
                {INTEREST_LABELS[i]}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="emailAlerts" defaultChecked={initial.emailAlerts} className="size-4 accent-[var(--primary)]" /> Email me price alerts
      </label>
      <div className="flex items-center gap-3">
        <Button type="submit">Save preferences</Button>
        {msg && (
          <p role="status" className="text-sm">
            {msg}
          </p>
        )}
      </div>
    </form>
  );
}

export function PriceAlertForm({ airports, destinations }: { airports: { iata: string; city: string }[]; destinations: { slug: string; name: string }[] }) {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const json = await api("/api/v1/account/price-alerts", "POST", {
      destination: f.get("destination"),
      origin: f.get("origin"),
      maxPriceUsd: Number(f.get("maxPriceUsd")),
    });
    setMsg(json.success ? "Alert created" : (json.error?.message ?? "Could not create alert"));
    if (json.success) router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-4">
      <NativeSelect aria-label="Destination" name="destination" required defaultValue="">
        <option value="" disabled>
          Destination
        </option>
        {destinations.map((d) => (
          <option key={d.slug} value={d.slug}>
            {d.name}
          </option>
        ))}
      </NativeSelect>
      <NativeSelect aria-label="Flying from" name="origin" defaultValue="SYD">
        {airports.map((a) => (
          <option key={a.iata} value={a.iata}>
            {a.city}
          </option>
        ))}
      </NativeSelect>
      <Input aria-label="Alert me under (USD)" name="maxPriceUsd" type="number" min={50} step={10} placeholder="Under $" required className="h-11" />
      <Button type="submit" className="h-11">
        Create alert
      </Button>
      {msg && (
        <p role="status" className="text-sm sm:col-span-4">
          {msg}
        </p>
      )}
    </form>
  );
}

export function RemoveButton({ url, body, label }: { url: string; body: unknown; label: string }) {
  const router = useRouter();
  return (
    <Button
      variant="ghost"
      size="sm"
      aria-label={label}
      onClick={async () => {
        await api(url, "DELETE", body);
        router.refresh();
      }}
    >
      Remove
    </Button>
  );
}

export function SaveDestinationButton({ slug }: { slug: string }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "saved">("idle");
  return (
    <Button
      variant="outline"
      size="xl"
      className="border-white/40 bg-white/10 text-white hover:bg-white/20 hover:text-white"
      onClick={async () => {
        const res = await fetch("/api/v1/account/saved-destinations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug }) });
        if (res.status === 401) return router.push(`/login?next=${encodeURIComponent(`/destinations/${slug}`)}`);
        setState("saved");
      }}
    >
      {state === "saved" ? "Saved ✓" : "Save destination"}
    </Button>
  );
}
