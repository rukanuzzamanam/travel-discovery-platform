"use client";

import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const PRIMARY = "#1d5f8a";
const ACCENT = "#e8683a";

export function TimeSeries({ data, label, color = "primary" }: { data: { day: string; n: number }[]; label: string; color?: "primary" | "accent" }) {
  if (data.length === 0) return <Empty />;
  return (
    <figure aria-label={label}>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ left: -16, right: 8, top: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="day" tick={{ fontSize: 11 }} tickFormatter={(d: string) => d.slice(5)} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Line type="monotone" dataKey="n" name={label} stroke={color === "accent" ? ACCENT : PRIMARY} strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="sr-only">{label} per day</figcaption>
    </figure>
  );
}

export function Bars({ data, label, valueLabel, money = false }: { data: { key: string; value: number }[]; label: string; valueLabel: string; money?: boolean }) {
  if (data.length === 0) return <Empty />;
  return (
    <figure aria-label={label}>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 24, right: 16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v: number) => (money ? `$${v}` : String(v))} />
            <YAxis type="category" dataKey="key" width={130} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v) => (money ? `$${Number(v).toFixed(2)}` : String(v))} />
            <Bar dataKey="value" name={valueLabel} fill={PRIMARY} radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="sr-only">{label}</figcaption>
    </figure>
  );
}

function Empty() {
  return <p className="grid h-40 place-items-center text-sm text-muted-foreground">No data in this period yet.</p>;
}
