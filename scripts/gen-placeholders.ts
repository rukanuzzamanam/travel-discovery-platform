/**
 * Generates abstract SVG hero placeholders so the site never depends on hot-linked stock photos.
 * Replace public/images/destinations/*.svg with licensed photography (update heroImage in content) when available.
 * Run: npx tsx scripts/gen-placeholders.ts
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { destinations } from "../content/destinations/destinations";

const OUT = "public/images/destinations";
mkdirSync(OUT, { recursive: true });

function hash(s: string) {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}

const PALETTES = {
  beach: { sky: ["#0ea5e9", "#fde68a"], far: "#0284c7", near: "#0369a1", sun: "#fff7ed" },
  city: { sky: ["#312e81", "#f472b6"], far: "#1e1b4b", near: "#0f172a", sun: "#fde68a" },
  mountain: { sky: ["#38bdf8", "#e0f2fe"], far: "#64748b", near: "#334155", sun: "#ffffff" },
  desert: { sky: ["#f97316", "#fde68a"], far: "#b45309", near: "#78350f", sun: "#fff7ed" },
} as const;

for (const d of destinations) {
  const p = PALETTES[d.theme];
  const h = hash(d.slug);
  const rot = (h % 40) - 20;
  const sunX = 300 + (h % 900);
  let shapes = "";
  if (d.theme === "beach") {
    shapes = `<path d="M0 620 Q 300 570 600 620 T 1200 620 T 1800 620 V900 H0Z" fill="${p.far}" opacity=".85"/>
<path d="M0 700 Q 400 650 800 700 T 1600 700 V900 H0Z" fill="${p.near}"/>
<path d="M0 800 Q 500 770 1000 800 T 1600 800 V900 H0Z" fill="#fde68a" opacity=".9"/>`;
  } else if (d.theme === "city") {
    const bars = Array.from({ length: 22 }, (_, i) => {
      const bh = 120 + ((h >> (i % 16)) % 260) + (i % 5) * 20;
      return `<rect x="${i * 75}" y="${760 - bh}" width="58" height="${bh + 140}" fill="${i % 2 ? p.far : p.near}"/>`;
    }).join("");
    shapes = bars;
  } else if (d.theme === "mountain") {
    shapes = `<path d="M0 700 L250 380 L480 640 L760 300 L1080 660 L1330 420 L1600 700 V900 H0Z" fill="${p.far}"/>
<path d="M0 800 L300 560 L620 780 L950 520 L1300 790 L1600 620 V900 H0Z" fill="${p.near}"/>`;
  } else {
    shapes = `<path d="M0 720 Q 400 600 800 700 T 1600 680 V900 H0Z" fill="${p.far}"/>
<path d="M0 800 Q 500 720 1000 800 T 1600 790 V900 H0Z" fill="${p.near}"/>`;
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
<defs><linearGradient id="g" gradientTransform="rotate(${90 + rot})"><stop offset="0" stop-color="${p.sky[0]}"/><stop offset="1" stop-color="${p.sky[1]}"/></linearGradient></defs>
<rect width="1600" height="900" fill="url(#g)"/>
<circle cx="${sunX}" cy="300" r="90" fill="${p.sun}" opacity=".85"/>
${shapes}
</svg>`;
  writeFileSync(`${OUT}/${d.slug}.svg`, svg);
}
console.log(`Wrote ${destinations.length} placeholders to ${OUT}`);
