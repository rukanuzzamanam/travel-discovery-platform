import type { Metadata } from "next";
import { AuthForm } from "@/components/layout/auth-form";

export const metadata: Metadata = {
  title: "Create account",
  robots: { index: false, follow: false },
};

export default function RegisterPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-3xl font-bold">Create your account</h1>
      <p className="mb-8 mt-2 text-muted-foreground">
        Save trips, destinations and itineraries. You never need an account to plan a trip.
      </p>
      <AuthForm mode="register" />
    </div>
  );
}
