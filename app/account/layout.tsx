import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Account", robots: { index: false, follow: false } };

export default async function AccountLayout({ children }: LayoutProps<"/account">) {
  // Server-side check (the proxy only does an optimistic redirect).
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/account");
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <nav aria-label="Account" className="mb-8 flex gap-4 border-b pb-3 text-sm font-medium">
        <Link href="/account" className="hover:text-primary">Overview</Link>
        <Link href="/account/trips" className="hover:text-primary">Saved trips</Link>
        {user.adminUser && <Link href="/admin" className="hover:text-primary">Admin</Link>}
      </nav>
      {children}
    </div>
  );
}
