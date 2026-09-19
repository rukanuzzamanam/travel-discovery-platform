import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { JsonLd } from "@/components/seo/json-ld";
import { breadcrumbSchema } from "@/lib/seo/schema";

export function Breadcrumbs({ items, light = false }: { items: { name: string; path: string }[]; light?: boolean }) {
  return (
    <nav aria-label="Breadcrumb" className={light ? "text-white/85" : "text-muted-foreground"}>
      <ol className="flex flex-wrap items-center gap-1 text-sm">
        {items.map((c, i) => (
          <li key={c.path} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="size-3.5" aria-hidden />}
            {i === items.length - 1 ? (
              <span aria-current="page" className={light ? "font-medium text-white" : "font-medium text-foreground"}>
                {c.name}
              </span>
            ) : (
              <Link href={c.path} className="hover:underline">
                {c.name}
              </Link>
            )}
          </li>
        ))}
      </ol>
      <JsonLd data={breadcrumbSchema(items)} />
    </nav>
  );
}
