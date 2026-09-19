import type { Instrumentation } from "next";

/**
 * Server-side error hook. Full details (stack, route) go to the logs only; users see generic messages.
 * To forward to Sentry, install @sentry/nextjs, call Sentry.init({ dsn: process.env.SENTRY_DSN }) in register(),
 * and call Sentry.captureRequestError(err, request, context) inside onRequestError.
 */
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  const e = err as Error & { digest?: string };
  console.error(
    JSON.stringify({
      level: "error",
      msg: "request_error",
      time: new Date().toISOString(),
      path: request.path,
      method: request.method,
      route: context.routePath,
      routeType: context.routeType,
      digest: e.digest,
      name: e.name,
      message: e.message,
      stack: e.stack,
    }),
  );
};
