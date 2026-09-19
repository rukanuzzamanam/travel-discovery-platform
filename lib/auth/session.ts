import "server-only";
import { cache as reactCache } from "react";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db/client";
import { env, isProd } from "@/lib/env";
import { ApiError } from "@/lib/http/api";
import type { AdminRole } from "@/lib/db/generated/client";

export const SESSION_COOKIE = "tripora_session";
export const SID_COOKIE = "tripora_sid";
const MAX_AGE = 60 * 60 * 24 * 30;

const key = () => new TextEncoder().encode(env().AUTH_SECRET);

export async function signSession(userId: string): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(key());
}

export async function verifySession(token: string | undefined): Promise<string | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ["HS256"] });
    return payload.sub ?? null;
  } catch {
    return null;
  }
}

/** Sets the httpOnly session cookie. Secure + SameSite=Lax; `Secure` is enforced in production. */
export async function startSession(userId: string) {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, await signSession(userId), {
    httpOnly: true,
    secure: isProd(),
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function endSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

/** Anonymous session id (set by proxy.ts). Falls back to a random id for the current request. */
export async function getSessionId(): Promise<string> {
  const jar = await cookies();
  return jar.get(SID_COOKIE)?.value ?? `anon-${randomUUID()}`;
}

export const getCurrentUser = reactCache(async () => {
  const jar = await cookies();
  const userId = await verifySession(jar.get(SESSION_COOKIE)?.value);
  if (!userId) return null;
  return db.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, adminUser: { select: { role: true } } },
  });
});

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new ApiError("UNAUTHENTICATED", "Please sign in to continue");
  return user;
}

const ROLE_RANK: Record<AdminRole, number> = { ANALYST: 1, EDITOR: 2, ADMIN: 3 };

/** RBAC: user must hold at least `minRole`. ANALYST < EDITOR < ADMIN. */
export async function requireAdmin(minRole: AdminRole = "ANALYST"): Promise<CurrentUser> {
  const user = await requireUser();
  const role = user.adminUser?.role;
  if (!role || ROLE_RANK[role] < ROLE_RANK[minRole]) {
    throw new ApiError("FORBIDDEN", "You do not have access to this resource");
  }
  return user;
}

export function hasRole(role: AdminRole | undefined, min: AdminRole) {
  return !!role && ROLE_RANK[role] >= ROLE_RANK[min];
}
