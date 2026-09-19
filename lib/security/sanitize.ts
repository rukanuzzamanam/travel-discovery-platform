/** Strip control chars and angle brackets, collapse whitespace, cap length. For free-text inputs. */
export function cleanText(input: string, max = 500): string {
  return input
    .replace(/[\p{Cc}]/gu, " ")
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

/** Only allow same-site relative paths (used for `next=` style params). */
export function safeInternalPath(path: string | null | undefined, fallback = "/"): string {
  if (!path) return fallback;
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\")) return fallback;
  return path;
}
