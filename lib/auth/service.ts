import "server-only";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { env } from "@/lib/env";
import { DEFAULT_CURRENCY, type Currency } from "@/lib/currency";
import { ApiError } from "@/lib/http/api";

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(8, "Use at least 8 characters").max(128),
  name: z.string().trim().min(1).max(80).optional(),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).max(128),
});

// Always run a bcrypt compare, even for unknown emails, to avoid leaking which emails exist.
const DUMMY_HASH = bcrypt.hashSync("tripora-dummy-password", 12);

export async function registerUser(input: z.infer<typeof registerSchema>, opts: { currency?: Currency } = {}) {
  const existing = await db.user.findUnique({ where: { email: input.email } });
  if (existing) throw new ApiError("CONFLICT", "An account with this email already exists");
  const passwordHash = await bcrypt.hash(input.password, 12);
  const bootstrap = env()
    .ADMIN_BOOTSTRAP_EMAILS.split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return db.user.create({
    data: {
      email: input.email,
      name: input.name,
      passwordHash,
      preferences: { create: { currency: opts.currency ?? DEFAULT_CURRENCY } },
      ...(bootstrap.includes(input.email) ? { adminUser: { create: { role: "ADMIN" } } } : {}),
    },
    select: { id: true, email: true, name: true },
  });
}

export async function verifyCredentials(input: z.infer<typeof loginSchema>) {
  const user = await db.user.findUnique({ where: { email: input.email } });
  const valid = await bcrypt.compare(input.password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !valid) throw new ApiError("UNAUTHENTICATED", "Incorrect email or password");
  return { id: user.id, email: user.email, name: user.name };
}
