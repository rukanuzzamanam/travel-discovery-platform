"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

type Props = Record<string, string | number | boolean | null>;

/** Fire-and-forget event to our internal collector (+ GA when present). Never throws. */
export function trackEvent(name: string, opts: { destination?: string; properties?: Props } = {}) {
  try {
    const body = JSON.stringify({ name, path: window.location.pathname, ...opts });
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/v1/analytics/events", new Blob([body], { type: "application/json" }));
    } else {
      void fetch("/api/v1/analytics/events", {
        method: "POST",
        body,
        headers: { "Content-Type": "application/json" },
        keepalive: true,
      });
    }
    const gtag = (window as unknown as { gtag?: (...a: unknown[]) => void }).gtag;
    gtag?.("event", name, { ...opts.properties, destination: opts.destination });
  } catch {
    /* analytics must never break the UI */
  }
}

export function PageViewTracker() {
  const pathname = usePathname();
  useEffect(() => {
    if (pathname.startsWith("/admin")) return;
    trackEvent("page_view");
  }, [pathname]);
  return null;
}

/** Fires a one-off event when a server-rendered page mounts (e.g. destination_viewed). */
export function TrackOnMount({ name, destination, properties }: { name: string; destination?: string; properties?: Props }) {
  useEffect(() => {
    trackEvent(name, { destination, properties });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, destination]);
  return null;
}
