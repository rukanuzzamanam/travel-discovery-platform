import "server-only";
import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { ZodError } from "zod";
import { logger, errorMeta } from "@/lib/logger";
import { checkRateLimit, LIMITS, type RateLimit } from "@/lib/security/rate-limit";

export type ErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "RATE_LIMITED"
  | "PROVIDER_UNAVAILABLE"
  | "CONFLICT"
  | "INTERNAL_ERROR";

const STATUS: Record<ErrorCode, number> = {
  VALIDATION_ERROR: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  RATE_LIMITED: 429,
  PROVIDER_UNAVAILABLE: 503,
  CONFLICT: 409,
  INTERNAL_ERROR: 500,
};

export class ApiError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ success: true, data }, init);
}

export function fail(code: ErrorCode, message: string, details?: unknown, headers?: HeadersInit) {
  return NextResponse.json(
    { success: false, error: { code, message, ...(details ? { details } : {}) } },
    { status: STATUS[code], headers },
  );
}

export function clientIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}

type Params = Record<string, string | string[]>;
type Ctx = { params: Promise<Params> };
type Handler = (args: { req: NextRequest; params: Params; ip: string; requestId: string }) => Promise<Response>;

/**
 * Wraps a route handler with: request id + logging, rate limiting, consistent error envelope.
 * Detailed errors are logged server-side; clients only ever see a generic message.
 */
export function api(handler: Handler, opts: { limit?: RateLimit } = {}) {
  return async (req: NextRequest, ctx: Ctx = { params: Promise.resolve({}) }) => {
    const requestId = randomUUID();
    const started = Date.now();
    const ip = clientIp(req);
    const rule = opts.limit ?? LIMITS.default;
    try {
      const rl = await checkRateLimit(rule, ip);
      if (!rl.allowed) {
        return fail("RATE_LIMITED", "Too many requests. Please slow down.", undefined, {
          "Retry-After": String(rl.retryAfter),
        });
      }
      const res = await handler({ req, params: await ctx.params, ip, requestId });
      res.headers.set("x-request-id", requestId);
      logger.info("request", {
        requestId,
        method: req.method,
        path: req.nextUrl.pathname,
        status: res.status,
        ms: Date.now() - started,
      });
      return res;
    } catch (e) {
      if (e instanceof ApiError) {
        logger.warn("api_error", { requestId, path: req.nextUrl.pathname, code: e.code, message: e.message });
        return fail(e.code, e.message, e.details);
      }
      if (e instanceof ZodError) {
        return fail(
          "VALIDATION_ERROR",
          "Invalid request",
          e.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
        );
      }
      logger.error("unhandled_error", { requestId, path: req.nextUrl.pathname, ...errorMeta(e) });
      return fail("INTERNAL_ERROR", "Something went wrong. Please try again.");
    }
  };
}

/** Parse a JSON body with a Zod schema. Throws ZodError (→ 400) on bad input. */
export async function parseBody<T>(req: NextRequest, schema: { parse: (v: unknown) => T }): Promise<T> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new ApiError("VALIDATION_ERROR", "Request body must be valid JSON");
  }
  return schema.parse(body);
}
