"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export type BuildPayload = {
  origin: string;
  destination: string;
  startDate: string;
  endDate: string;
  travellers: number;
  budget?: number;
  /** Currency `budget` is expressed in. */
  currency?: string;
  style: string;
  interests: string[];
  itinerarySlug?: string;
};

export function BuildItineraryButton({ payload, label = "Build My Itinerary" }: { payload: BuildPayload; label?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function build() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/trips", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message ?? "Could not build itinerary");
      router.push(json.data.path);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <div>
      <Button type="button" size="xl" onClick={build} disabled={busy}>
        <Sparkles aria-hidden /> {busy ? "Building…" : label}
      </Button>
      {error && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
