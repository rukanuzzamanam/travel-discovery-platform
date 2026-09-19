import type { Metadata } from "next";
import { AuthForm } from "@/components/layout/auth-form";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : undefined;
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-3xl font-bold">Welcome back</h1>
      <p className="mb-8 mt-2 text-muted-foreground">Sign in to see your saved trips and preferences.</p>
      <AuthForm mode="login" next={next} />
    </div>
  );
}
