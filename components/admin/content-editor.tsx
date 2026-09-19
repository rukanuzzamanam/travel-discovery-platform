"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/native-select";

export type Field = { name: string; label: string; type: "text" | "textarea" | "number" | "status"; value: string | number | null };

export function ContentEditor({ kind, id, title, status, fields }: { kind: string; id: string; title: string; status: string; fields: Field[] }) {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const body: Record<string, unknown> = {};
    for (const fld of fields) {
      const v = f.get(fld.name);
      if (v === null) continue;
      body[fld.name] = fld.type === "number" ? (v === "" ? null : Number(v)) : (v as string) === "" && fld.name.startsWith("seo") ? null : v;
    }
    const res = await fetch(`/api/v1/admin/content/${kind}/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const json = await res.json();
    setMsg(json.success ? "Saved" : (json.error?.message ?? "Failed to save"));
    if (json.success) router.refresh();
  }

  return (
    <details className="rounded-xl border bg-card">
      <summary className="flex cursor-pointer items-center justify-between gap-3 p-4 font-medium">
        <span>{title}</span>
        <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">{status}</span>
      </summary>
      <form onSubmit={onSubmit} className="space-y-3 border-t p-4">
        {fields.map((fld) => {
          const fid = `${id}-${fld.name}`;
          return (
            <div key={fld.name} className="space-y-1.5">
              <Label htmlFor={fid}>{fld.label}</Label>
              {fld.type === "textarea" ? (
                <Textarea id={fid} name={fld.name} defaultValue={String(fld.value ?? "")} rows={fld.name === "content" ? 14 : 4} />
              ) : fld.type === "status" ? (
                <NativeSelect id={fid} name={fld.name} defaultValue={String(fld.value)}>
                  <option>DRAFT</option>
                  <option>PUBLISHED</option>
                  <option>ARCHIVED</option>
                </NativeSelect>
              ) : (
                <Input id={fid} name={fld.name} type={fld.type} defaultValue={fld.value ?? ""} />
              )}
            </div>
          );
        })}
        <div className="flex items-center gap-3">
          <Button type="submit">Save</Button>
          {msg && <p role="status" className="text-sm">{msg}</p>}
        </div>
      </form>
    </details>
  );
}

export function NewGuideForm() {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const res = await fetch("/api/v1/admin/content/guides", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(f)) });
    const json = await res.json();
    setMsg(json.success ? "Draft created" : (json.error?.details?.[0]?.message ?? json.error?.message ?? "Failed"));
    if (json.success) router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-xl border bg-card p-4">
      <h2 className="font-semibold">New guide (saved as draft)</h2>
      <Input name="title" placeholder="Title" required aria-label="Title" />
      <Input name="description" placeholder="Short description" required aria-label="Description" />
      <Textarea name="content" placeholder="Markdown content" rows={6} required aria-label="Markdown content" />
      <div className="flex items-center gap-3">
        <Button type="submit">Create draft</Button>
        {msg && <p role="status" className="text-sm">{msg}</p>}
      </div>
    </form>
  );
}

export function RoleSelect({ userId, role, disabled }: { userId: string; role: string | null; disabled?: boolean }) {
  const router = useRouter();
  return (
    <NativeSelect
      aria-label="Admin role"
      defaultValue={role ?? ""}
      disabled={disabled}
      className="h-9 w-36"
      onChange={async (e) => {
        await fetch(`/api/v1/admin/users/${userId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role: e.target.value || null }) });
        router.refresh();
      }}
    >
      <option value="">No admin access</option>
      <option value="ANALYST">Analyst</option>
      <option value="EDITOR">Editor</option>
      <option value="ADMIN">Admin</option>
    </NativeSelect>
  );
}
