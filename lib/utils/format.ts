export const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export const monthShort = (m: number) => MONTH_NAMES[m - 1]?.slice(0, 3) ?? "";

/** Collapses [4,5,6,7,8,9,10] into "April–October"; handles wrap-around (Nov–Feb). */
export function formatMonthRange(months: number[]): string {
  const set = new Set(months);
  if (set.size === 0 || set.size >= 12) return "Year-round";
  const next = (m: number) => (m === 12 ? 1 : m + 1);
  const starts = [...set].filter((m) => !set.has(m === 1 ? 12 : m - 1)).sort((x, y) => x - y);
  return starts
    .map((s) => {
      let e = s;
      while (set.has(next(e))) e = next(e);
      return e === s ? MONTH_NAMES[s - 1] : `${MONTH_NAMES[s - 1]}–${MONTH_NAMES[e - 1]}`;
    })
    .join(", ");
}

export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
