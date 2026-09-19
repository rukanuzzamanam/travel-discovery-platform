import Link from "next/link";
import { Compass, Heart, User } from "lucide-react";
import { DesktopNav } from "./desktop-nav";
import { MobileNav } from "./mobile-nav";
import { CurrencySelector } from "@/components/currency/currency-selector";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Static (no session read) so pages stay cacheable; /account redirects to sign-in when needed. */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold tracking-tight" aria-label="Tripora home">
          <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Compass className="size-5" aria-hidden />
          </span>
          Tripora
        </Link>
        <DesktopNav />
        <div className="flex items-center gap-1">
          <CurrencySelector compact className="hidden sm:block" />
          <Link href="/account/trips" className={cn(buttonVariants({ variant: "ghost", size: "lg" }), "hidden sm:inline-flex")}>
            <Heart aria-hidden /> Saved Trips
          </Link>
          <Link href="/account" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "hidden sm:inline-flex")}>
            <User aria-hidden /> Account
          </Link>
          <MobileNav />
        </div>
      </div>
    </header>
  );
}
