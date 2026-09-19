import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

/**
 * Runs before routing. Two jobs:
 *  1. Give every visitor an anonymous, httpOnly session id (used for analytics + affiliate attribution).
 *  2. Optimistic auth gate for /account and /admin. Real authorization is enforced again on the server
 *     (layouts + route handlers) — this is only a fast redirect for signed-out visitors.
 */
const SID = "tripora_sid";
const SESSION = "tripora_session";

async function hasValidSession(req: NextRequest) {
  const token = req.cookies.get(SESSION)?.value;
  const secret = process.env.AUTH_SECRET;
  if (!token || !secret) return false;
  try {
    await jwtVerify(token, new TextEncoder().encode(secret), { algorithms: ["HS256"] });
    return true;
  } catch {
    return false;
  }
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if ((pathname.startsWith("/account") || pathname.startsWith("/admin")) && !(await hasValidSession(req))) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }

  const res = NextResponse.next();
  if (!req.cookies.get(SID)) {
    res.cookies.set(SID, crypto.randomUUID(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  if (pathname.startsWith("/admin") || pathname.startsWith("/account")) {
    res.headers.set("X-Robots-Tag", "noindex, nofollow");
  }
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|images/|favicon.ico|icon.svg|robots.txt|sitemap.xml).*)"],
};
