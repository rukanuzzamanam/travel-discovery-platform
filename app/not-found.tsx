import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <p className="text-sm font-semibold text-primary">404</p>
      <h1 className="mt-2 text-4xl font-bold">We couldn&apos;t find that page</h1>
      <p className="mt-3 text-muted-foreground">The link may be outdated, or the page may have moved.</p>
      <div className="mt-8 flex justify-center gap-3">
        <Link href="/" className={cn(buttonVariants({ size: "xl" }))}>
          Back to home
        </Link>
        <Link href="/destinations" className={cn(buttonVariants({ size: "xl", variant: "outline" }))}>
          Browse destinations
        </Link>
      </div>
    </div>
  );
}
