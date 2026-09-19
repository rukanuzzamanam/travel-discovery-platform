import "server-only";
import { z } from "zod";

/**
 * Server-side environment. Never import this from a client component.
 * Secrets must never be exposed via NEXT_PUBLIC_ variables.
 */
const schema = z.object({
  DATABASE_URL: z.string().min(1),
  AUTH_SECRET: z.string().min(32, "AUTH_SECRET must be at least 32 characters"),
  ADMIN_BOOTSTRAP_EMAILS: z.string().default(""),
  TRAVELPOUTS_API_TOKEN: z.string().optional(),
  TRAVELPOUTS_PROJECT_ID: z.string().optional(),
  TRAVELPOUTS_WHITE_LABEL_URL: z.string().url().optional().or(z.literal("")),
  AI_API_KEY: z.string().optional(),
  AI_MODEL: z.string().default("claude-sonnet-5"),
  NEXT_PUBLIC_SITE_URL: z.string().url().default("http://localhost:3000"),
});

export type Env = z.infer<typeof schema>;

let cached: Env | undefined;

export function env(): Env {
  if (!cached) {
    const parsed = schema.safeParse(process.env);
    if (!parsed.success) {
      const fields = parsed.error.issues.map((i) => i.path.join(".")).join(", ");
      throw new Error(`Invalid environment configuration: ${fields}`);
    }
    cached = parsed.data;
  }
  return cached;
}

export const isProd = () => process.env.NODE_ENV === "production";
