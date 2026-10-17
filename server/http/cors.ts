import type { RequestHandler } from "express";

/** Parse FRONTEND_ORIGIN (comma-separated) into normalised origins (no trailing slash). */
export function parseOrigins(raw: string | undefined): string[] {
  return (raw ?? "")
    .split(",")
    .map((o) => o.trim().replace(/\/+$/, ""))
    .filter(Boolean);
}

/**
 * Strict allowlist CORS. Reads FRONTEND_ORIGIN at request time (so an env change needs no code change).
 * Unlisted or missing origins get NO CORS headers (browser blocks them); there is never a wildcard.
 */
export function corsFromEnv(getRaw: () => string | undefined = () => process.env.FRONTEND_ORIGIN): RequestHandler {
  let warned = false;
  return (req, res, next) => {
    const allowed = parseOrigins(getRaw());
    if (allowed.length === 0 && !warned) {
      warned = true;
      console.warn("[cors] FRONTEND_ORIGIN is not set; cross-origin browser calls will be blocked");
    }
    const origin = req.header("origin");
    const ok = !!origin && allowed.includes(origin.replace(/\/+$/, ""));
    res.setHeader("Vary", "Origin");
    if (ok) {
      res.setHeader("Access-Control-Allow-Origin", origin!);
      res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
      res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
      res.setHeader("Access-Control-Max-Age", "600");
    }
    if (req.method === "OPTIONS") return res.status(ok ? 204 : 403).end();
    next();
  };
}
