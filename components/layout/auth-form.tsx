"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { safeInternalPath } from "@/lib/security/sanitize";
import { syncCurrencyFromAccount } from "@/components/currency/currency-provider";

const schema = z.object({
  name: z.string().trim().max(80).optional(),
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(8, "Use at least 8 characters"),
});
type Values = z.infer<typeof schema>;

export function AuthForm({ mode, next }: { mode: "login" | "register"; next?: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema) });

  async function onSubmit(values: Values) {
    setError(null);
    const res = await fetch(`/api/v1/auth/${mode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(mode === "register" ? values : { email: values.email, password: values.password }),
    });
    const json = await res.json();
    if (!json.success) {
      setError(json.error?.message ?? "Something went wrong");
      return;
    }
    if (mode === "login") await syncCurrencyFromAccount();
    router.push(safeInternalPath(next, "/account"));
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      {mode === "register" && (
        <div className="space-y-1.5">
          <Label htmlFor="name">Name (optional)</Label>
          <Input id="name" autoComplete="name" {...register("name")} />
        </div>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? "email-error" : undefined}
          {...register("email")}
        />
        {errors.email && (
          <p id="email-error" role="alert" className="text-sm text-destructive">
            {errors.email.message}
          </p>
        )}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          aria-invalid={!!errors.password}
          aria-describedby={errors.password ? "password-error" : undefined}
          {...register("password")}
        />
        {errors.password && (
          <p id="password-error" role="alert" className="text-sm text-destructive">
            {errors.password.message}
          </p>
        )}
      </div>
      {error && (
        <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
      <Button type="submit" size="xl" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        {mode === "login" ? (
          <>
            New to Tripora?{" "}
            <Link className="font-medium text-primary underline" href="/register">
              Create an account
            </Link>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <Link className="font-medium text-primary underline" href="/login">
              Sign in
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
