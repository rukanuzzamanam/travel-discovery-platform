"use client";

import { useState } from "react";
import Link from "next/link";
import { Compass, Heart, Menu, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { NAV } from "@/lib/site";

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button variant="ghost" size="icon-lg" className="lg:hidden" aria-label="Open menu" />}>
        <Menu className="size-5" aria-hidden />
      </SheetTrigger>
      <SheetContent side="right" className="w-[85%] max-w-xs p-0">
        <div className="flex items-center gap-2 border-b px-4 py-4">
          <Compass className="size-5 text-primary" aria-hidden />
          <SheetTitle className="text-base font-semibold">Tripora</SheetTitle>
        </div>
        <nav aria-label="Mobile" className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={close}
              className="rounded-lg px-3 py-3 text-base font-medium hover:bg-muted"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="grid gap-2 border-t p-3">
          <Link href="/account/trips" onClick={close} className="flex items-center gap-2 rounded-lg px-3 py-3 font-medium hover:bg-muted">
            <Heart className="size-4" aria-hidden /> Saved Trips
          </Link>
          <Link href="/account" onClick={close} className="flex items-center gap-2 rounded-lg px-3 py-3 font-medium hover:bg-muted">
            <User className="size-4" aria-hidden /> Account
          </Link>
        </div>
      </SheetContent>
    </Sheet>
  );
}
