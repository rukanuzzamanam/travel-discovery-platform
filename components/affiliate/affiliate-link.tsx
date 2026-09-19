import { ExternalLink } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Outbound booking link. `href` is always an internal /go/... path; the target URL is decided server-side.
 * rel="sponsored nofollow" is required for affiliate links.
 */
export function AffiliateLink({
  href,
  children,
  variant = "default",
  className,
}: {
  href: string;
  children: React.ReactNode;
  variant?: "default" | "outline" | "secondary";
  className?: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="sponsored nofollow noopener noreferrer"
      className={cn(buttonVariants({ size: "xl", variant }), className)}
    >
      {children}
      <ExternalLink aria-hidden className="size-4" />
      <span className="sr-only"> (opens partner site in a new tab)</span>
    </a>
  );
}
