import { randomBytes } from "node:crypto";

/** Unique, URL-safe sub id (alphanumeric only) attached to each outbound click. */
export function makeSubId(): string {
  return `tr${randomBytes(9).toString("hex")}`;
}
