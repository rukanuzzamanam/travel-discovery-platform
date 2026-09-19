"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";

export function ConversionForm() {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const commission = f.get("commission") as string;
    const res = await fetch("/api/v1/admin/conversions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subId: f.get("subId"),
        commission: commission ? Number(commission) : null,
        currency: "USD",
        status: f.get("status"),
        bookingReference: (f.get("bookingReference") as string) || null,
      }),
    });
    const json = await res.json();
    setMsg(json.success ? "Conversion recorded" : (json.error?.message ?? "Failed"));
    if (json.success) router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-5">
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="cv-sub">Click sub id</Label>
        <Input id="cv-sub" name="subId" required placeholder="tr…" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="cv-com">Commission (USD)</Label>
        <Input id="cv-com" name="commission" type="number" step="0.01" min={0} placeholder="pending" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="cv-st">Status</Label>
        <NativeSelect id="cv-st" name="status" defaultValue="PENDING">
          <option>PENDING</option>
          <option>CONFIRMED</option>
          <option>REJECTED</option>
        </NativeSelect>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="cv-ref">Booking ref</Label>
        <Input id="cv-ref" name="bookingReference" />
      </div>
      <div className="flex items-center gap-3 sm:col-span-5">
        <Button type="submit">Save conversion</Button>
        {msg && <p role="status" className="text-sm">{msg}</p>}
      </div>
    </form>
  );
}
