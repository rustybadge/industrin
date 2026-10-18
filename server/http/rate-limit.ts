import type { Request, RequestHandler } from "express";

export interface Limiter {
  /** Returns true if the call is allowed. */
  hit(key: string): boolean;
}

/** Tiny in-memory fixed-window limiter (single Render instance). Swap for Redis if we scale out. */
export function createLimiter(max: number, windowMs: number, now: () => number = Date.now): Limiter {
  const buckets = new Map<string, { n: number; reset: number }>();
  return {
    hit(key) {
      const t = now();
      if (buckets.size > 5000) for (const [k, b] of Array.from(buckets)) if (b.reset <= t) buckets.delete(k);
      const b = buckets.get(key);
      if (!b || b.reset <= t) { buckets.set(key, { n: 1, reset: t + windowMs }); return true; }
      b.n += 1;
      return b.n <= max;
    },
  };
}

export const limitBy = (limiter: Limiter, keyOf: (req: Request) => string): RequestHandler => (req, res, next) =>
  limiter.hit(keyOf(req)) ? next() : res.status(429).json({ message: "För många förfrågningar. Försök igen om en stund." });
