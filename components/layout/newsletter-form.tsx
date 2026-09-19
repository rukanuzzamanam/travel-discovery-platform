"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const OPTIONS = [
  ["deals", "Travel deals"],
  ["weekend", "Weekend trips"],
  ["inspiration", "Destination inspiration"],
  ["budget", "Budget travel"],
] as const;

export function NewsletterForm({ source, showPreferences = false }: { source: string; showPreferences?: boolean }) {
  const uid = useId();
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const preferences = form.getAll("preferences").map(String);
    setState("loading");
    const res = await fetch("/api/v1/newsletter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: form.get("email"), source, ...(preferences.length ? { preferences } : {}) }),
    });
    const json = await res.json().catch(() => null);
    if (json?.success) {
      setState("done");
      setMessage("Thanks! You're on the list.");
    } else {
      setState("error");
      setMessage(json?.error?.message ?? "Something went wrong. Please try again.");
    }
  }

  if (state === "done") {
    return (
      <p role="status" className="rounded-lg bg-emerald-50 px-4 py-3 font-medium text-emerald-800">
        {message}
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="flex-1">
          <Label htmlFor={`${uid}-email`} className="sr-only">
            Email address
          </Label>
          <Input id={`${uid}-email`} name="email" type="email" required autoComplete="email" placeholder="you@example.com" className="h-12 text-base" />
        </div>
        <Button type="submit" size="xl" disabled={state === "loading"}>
          {state === "loading" ? "Subscribing…" : "Subscribe"}
        </Button>
      </div>
      {showPreferences && (
        <fieldset>
          <legend className="mb-2 text-sm font-medium">I&apos;m interested in</legend>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {OPTIONS.map(([value, label]) => (
              <label key={value} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="preferences" value={value} defaultChecked className="size-4 accent-[var(--primary)]" />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      {state === "error" && (
        <p role="alert" className="text-sm text-destructive">
          {message}
        </p>
      )}
      <p className="text-xs text-muted-foreground">No spam. Unsubscribe any time.</p>
    </form>
  );
}
