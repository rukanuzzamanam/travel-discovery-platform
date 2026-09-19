import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };

const LINKS = [
  ["/admin", "Overview"],
  ["/admin/analytics", "Analytics"],
  ["/admin/destinations", "Destinations"],
  ["/admin/guides", "Guides"],
  ["/admin/itineraries", "Itineraries"],
  ["/admin/deals", "Deals"],
  ["/admin/searches", "Searches"],
  ["/admin/affiliate-clicks", "Affiliate clicks"],
  ["/admin/revenue", "Revenue"],
  ["/admin/users", "Users"],
] as const;

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  // RBAC: every admin page requires an AdminUser row (any role). Individual pages/APIs enforce stricter roles.
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin");
  if (!user.adminUser) redirect("/");
  return (
    <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[13rem_minmax(0,1fr)] lg:px-8">
      <nav aria-label="Admin" className="flex flex-wrap gap-1 lg:flex-col">
        {LINKS.map(([href, label]) => (
          <Link key={href} href={href} className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-muted">
            {label}
          </Link>
        ))}
        <p className="mt-4 hidden px-3 text-xs text-muted-foreground lg:block">
          Signed in as {user.email}
          <br />
          Role: {user.adminUser.role}
        </p>
      </nav>
      <div className="min-w-0 space-y-6">{children}</div>
    </div>
  );
}
