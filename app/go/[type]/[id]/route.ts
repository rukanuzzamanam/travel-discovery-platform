import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db/client";
import { logger, errorMeta } from "@/lib/logger";
import { checkRateLimit, LIMITS } from "@/lib/security/rate-limit";
import { clientIp } from "@/lib/http/api";
import { cleanText, safeInternalPath } from "@/lib/security/sanitize";
import { SEGMENT_TO_TYPE } from "@/lib/affiliate/links";
import { buildAffiliateUrl } from "@/lib/affiliate/affiliate-router";
import { makeSubId } from "@/lib/affiliate/travelpayouts/tracking";
import { getCurrentUser, getSessionId } from "@/lib/auth/session";
import { track } from "@/lib/analytics/track";
import type { EventName } from "@/lib/analytics/events";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EVENT: Record<string, EventName> = {
  FLIGHT: "flight_affiliate_click",
  HOTEL: "hotel_affiliate_click",
  ACTIVITY: "activity_affiliate_click",
  CAR: "car_affiliate_click",
};

const notFound = () => new NextResponse("Not found", { status: 404, headers: { "X-Robots-Tag": "noindex" } });

/**
 * Affiliate redirect: /go/<flight|hotel|activity|car>/<link-id>
 * 1 validate id  2 record click (+session, source, destination, product)  3 build the approved URL  4 redirect.
 * The target URL is NEVER read from the request, so this endpoint cannot be used as an open redirect.
 */
export async function GET(req: NextRequest, ctx: RouteContext<"/go/[type]/[id]">) {
  const { type, id } = await ctx.params;
  const product = SEGMENT_TO_TYPE[type];
  if (!product || !UUID.test(id)) return notFound();

  const rl = await checkRateLimit(LIMITS.redirect, clientIp(req));
  if (!rl.allowed) return new NextResponse("Too many requests", { status: 429, headers: { "Retry-After": String(rl.retryAfter) } });

  try {
    const link = await db.affiliateLink.findUnique({ where: { id } });
    if (!link || link.productType !== product) return notFound();

    const sp = req.nextUrl.searchParams;
    const sourcePage = safeInternalPath(sp.get("from"), "/");
    const sourceComponent = sp.get("c") ? cleanText(sp.get("c")!, 60) : undefined;
    const campaign = sp.get("cmp") ? cleanText(sp.get("cmp")!, 60) : undefined;
    const subId = makeSubId();

    const { url, provider } = buildAffiliateUrl({ ...link, productType: product }, { subId, campaign });

    const [sessionId, user] = await Promise.all([getSessionId(), getCurrentUser()]);
    await db.affiliateClick.create({
      data: {
        linkId: link.id,
        sessionId,
        userId: user?.id,
        provider: provider.id,
        productType: link.productType,
        destinationId: link.destinationId,
        sourcePage,
        sourceComponent,
        campaign,
        affiliateUrl: url,
        subId,
      },
    });
    await track(EVENT[product], {
      sessionId,
      userId: user?.id,
      path: sourcePage,
      properties: { provider: provider.id, component: sourceComponent ?? null },
    });

    return NextResponse.redirect(url, { status: 302, headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" } });
  } catch (e) {
    // Includes UnsafeRedirectError: log details, show nothing to the visitor.
    logger.error("affiliate_redirect_failed", { id, type, ...errorMeta(e) });
    return new NextResponse("This link is temporarily unavailable.", { status: 503, headers: { "X-Robots-Tag": "noindex" } });
  }
}
