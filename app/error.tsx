"use client";

import { Button } from "@/components/ui/button";

// Never render error.message: server errors may contain internals. Details are logged server-side.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="text-3xl font-bold">Something went wrong</h1>
      <p className="mt-3 text-muted-foreground">Please try again. If the problem continues, come back in a few minutes.</p>
      <Button className="mt-8" size="xl" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
