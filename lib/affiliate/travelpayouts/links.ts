import "server-only";
import type { FlightLinkParams, HotelLinkParams, ActivityLinkParams, CarLinkParams, LinkContext } from "../affiliate-provider";
import { BRAND_HOSTS, TRACKING_HOST, travelpayoutsConfig } from "./config";

/**
 * Link builders. Two documented mechanisms are used, never an invented API:
 *  1. White Label: if TRAVELPOUTS_WHITE_LABEL_URL is set, flights/hotels go to your own search subdomain.
 *  2. Partner redirect (tp.media): brand URL wrapped with your marker, project (trs) and program (p) ids.
 * If a program id is not configured, the plain brand URL is returned with the marker attached where the
 * brand supports it (Aviasales search links accept `marker`).
 */

const ddmm = (iso?: string) => (iso ? `${iso.slice(8, 10)}${iso.slice(5, 7)}` : "");

function wrap(brandUrl: string, program: string, ctx: LinkContext): string {
  const c = travelpayoutsConfig();
  if (!c.marker || !program) return brandUrl;
  const u = new URL(`https://${TRACKING_HOST}/r`);
  u.searchParams.set("marker", c.marker);
  if (c.trs) u.searchParams.set("trs", c.trs);
  u.searchParams.set("p", program);
  u.searchParams.set("u", brandUrl);
  u.searchParams.set("sub_id", ctx.subId);
  if (ctx.campaign) u.searchParams.set("campaign", ctx.campaign);
  return u.toString();
}

export function flightLink(p: FlightLinkParams, ctx: LinkContext): string {
  const c = travelpayoutsConfig();
  if (c.whiteLabelUrl) {
    const u = new URL(`${c.whiteLabelUrl}/flights/`);
    u.searchParams.set("origin_iata", p.origin);
    u.searchParams.set("destination_iata", p.destination);
    if (p.departDate) u.searchParams.set("depart_date", p.departDate);
    if (p.returnDate) u.searchParams.set("return_date", p.returnDate);
    u.searchParams.set("adults", String(p.adults));
    return u.toString();
  }
  // Aviasales search path: ORIGIN + DDMM + DESTINATION [+ DDMM] + passengers
  const path = `${p.origin}${ddmm(p.departDate)}${p.destination}${ddmm(p.returnDate)}${p.adults}`;
  const brand = new URL(`https://${BRAND_HOSTS.flight}/search/${path}`);
  if (c.marker && !c.programs.flight) brand.searchParams.set("marker", `${c.marker}.${ctx.subId}`);
  return wrap(brand.toString(), c.programs.flight, ctx);
}

export function hotelLink(p: HotelLinkParams, ctx: LinkContext): string {
  const c = travelpayoutsConfig();
  if (c.whiteLabelUrl) {
    const u = new URL(`${c.whiteLabelUrl}/hotels/`);
    u.searchParams.set("destination", p.destinationName);
    if (p.checkIn) u.searchParams.set("check_in", p.checkIn);
    if (p.checkOut) u.searchParams.set("check_out", p.checkOut);
    u.searchParams.set("adults", String(p.adults));
    return u.toString();
  }
  const brand = new URL(`https://${BRAND_HOSTS.hotel}/`);
  brand.searchParams.set("destination", p.destinationName);
  if (p.checkIn) brand.searchParams.set("checkIn", p.checkIn);
  if (p.checkOut) brand.searchParams.set("checkOut", p.checkOut);
  brand.searchParams.set("adults", String(p.adults));
  return wrap(brand.toString(), c.programs.hotel, ctx);
}

export function activityLink(p: ActivityLinkParams, ctx: LinkContext): string {
  const brand = new URL(`https://${BRAND_HOSTS.activity}/s/`);
  brand.searchParams.set("q", p.destinationName);
  return wrap(brand.toString(), travelpayoutsConfig().programs.activity, ctx);
}

export function carLink(p: CarLinkParams, ctx: LinkContext): string {
  const brand = new URL(`https://${BRAND_HOSTS.car}/`);
  brand.searchParams.set("q", p.destinationName);
  return wrap(brand.toString(), travelpayoutsConfig().programs.car, ctx);
}
