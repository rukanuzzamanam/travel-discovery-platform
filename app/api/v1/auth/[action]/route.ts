import { api, ok, parseBody, ApiError } from "@/lib/http/api";
import { LIMITS } from "@/lib/security/rate-limit";
import { loginSchema, registerSchema, registerUser, verifyCredentials } from "@/lib/auth/service";
import { endSession, startSession } from "@/lib/auth/session";
import { track } from "@/lib/analytics/track";
import { CURRENCY_COOKIE, parseCurrency } from "@/lib/currency";

export const POST = api(
  async ({ req, params }) => {
    switch (params.action) {
      case "register": {
        const user = await registerUser(await parseBody(req, registerSchema), { currency: parseCurrency(req.cookies.get(CURRENCY_COOKIE)?.value) });
        await startSession(user.id);
        await track("signup", { userId: user.id });
        return ok({ user }, { status: 201 });
      }
      case "login": {
        const user = await verifyCredentials(await parseBody(req, loginSchema));
        await startSession(user.id);
        return ok({ user });
      }
      case "logout": {
        await endSession();
        return ok({});
      }
      default:
        throw new ApiError("NOT_FOUND", "Unknown auth action");
    }
  },
  { limit: LIMITS.auth },
);
