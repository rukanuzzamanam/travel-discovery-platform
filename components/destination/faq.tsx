import { JsonLd } from "@/components/seo/json-ld";
import { faqSchema } from "@/lib/seo/schema";

/** Native <details> accordion: accessible by default, zero client JS. Emits FAQPage JSON-LD. */
export function Faq({ items, heading = "Frequently asked questions" }: { items: { q: string; a: string }[]; heading?: string }) {
  if (items.length === 0) return null;
  return (
    <section aria-labelledby="faq-heading">
      <h2 id="faq-heading" className="text-2xl font-bold">
        {heading}
      </h2>
      <div className="mt-4 divide-y rounded-xl border bg-card">
        {items.map((f) => (
          <details key={f.q} className="group p-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium [&::-webkit-details-marker]:hidden">
              {f.q}
              <span aria-hidden className="text-xl leading-none text-muted-foreground transition-transform group-open:rotate-45">
                +
              </span>
            </summary>
            <p className="mt-2 text-muted-foreground">{f.a}</p>
          </details>
        ))}
      </div>
      <JsonLd data={faqSchema(items)} />
    </section>
  );
}
