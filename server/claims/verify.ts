import { Router, type Request, type Response } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";
import type { Mailer } from "../emails/send";
import { ownerWelcome } from "../emails/templates";
import { corsFromEnv, parseOrigins } from "../http/cors";
import { createLimiter, limitBy, type Limiter } from "../http/rate-limit";

/** Auth failure -> 401. */
export class AuthError extends Error {}

export interface VerifiedToken {
  sub: string;
}

/**
 * Verify a Clerk JWT-template token signed with a custom HS256 key (CLERK_JWT_SECRET).
 *  - algorithm pinned to HS256 (blocks alg:none and RS/HS key-confusion)
 *  - signature, exp and nbf enforced; `exp` is mandatory
 *  - optional issuer (CLERK_JWT_ISSUER) and authorized-party (azp vs FRONTEND_ORIGIN) checks
 * The secret is only ever read from the environment.
 */
export function createHs256Verifier(opts: {
  secret: string;
  issuer?: string;
  allowedOrigins?: string[];
}): (token: string) => VerifiedToken {
  return (token) => {
    let payload: JwtPayload;
    try {
      const decoded = jwt.verify(token, opts.secret, {
        algorithms: ["HS256"],
        clockTolerance: 5,
        ...(opts.issuer ? { issuer: opts.issuer } : {}),
      });
      if (typeof decoded === "string") throw new Error("unexpected string payload");
      payload = decoded;
    } catch {
      throw new AuthError("invalid token");
    }
    if (typeof payload.exp !== "number") throw new AuthError("token has no expiry");
    if (typeof payload.sub !== "string" || !payload.sub.startsWith("user_")) throw new AuthError("token has no user subject");
    const azp = (payload as any).azp;
    if (azp && opts.allowedOrigins?.length && !opts.allowedOrigins.includes(String(azp).replace(/\/+$/, ""))) {
      throw new AuthError("token not issued for this frontend");
    }
    return { sub: payload.sub };
  };
}

export interface VerifyDeps {
  /** Reads CLERK_JWT_SECRET lazily; undefined => endpoint answers 503. */
  getVerifier: () => ((token: string) => VerifiedToken) | null;
  /** Clerk-verified primary email for a user id, or null. Authoritative source (not token claims). */
  getVerifiedEmail: (clerkUserId: string) => Promise<string | null>;
  bind: (p: { clerkUserId: string; email: string }) => Promise<{
    companyId: string; companyName: string; ownerName: string; ownerEmail: string; changed: boolean;
  }>;
  mailer: Mailer;
  portalUrl: string;
  /** Maps domain errors to HTTP codes (kept out of this file so it has no DB import). */
  classify: (err: unknown) => { status: number; message: string } | null;
  ipLimiter?: Limiter;
  userLimiter?: Limiter;
}

const bearer = (req: Request): string | null => {
  const m = /^Bearer\s+([\w-]+\.[\w-]+\.[\w-]+)$/.exec(req.header("authorization") ?? "");
  return m ? m[1] : null;
};

/**
 * POST /api/claims/verify  (Authorization: Bearer <Clerk template JWT>, empty body)
 *  1 verify token  2 resolve verified email via Clerk  3 DB transaction (approved-claim gate, bind, Verified)
 *  4 after commit, Swedish welcome email (first time only)
 */
export function createVerifyRouter(deps: VerifyDeps): Router {
  const router = Router();
  const ipLimiter = deps.ipLimiter ?? createLimiter(30, 60_000);
  const userLimiter = deps.userLimiter ?? createLimiter(5, 60_000);

  router.use(corsFromEnv());
  router.post("/", limitBy(ipLimiter, (r) => `ip:${r.ip}`), async (req: Request, res: Response) => {
    const verifier = deps.getVerifier();
    if (!verifier) {
      console.error("[claims/verify] CLERK_JWT_SECRET is not configured");
      return res.status(503).json({ message: "Verification is not configured" });
    }

    const token = bearer(req);
    if (!token) return res.status(401).json({ message: "Missing bearer token" });

    let sub: string;
    try {
      sub = verifier(token).sub;
    } catch {
      return res.status(401).json({ message: "Invalid or expired token" });
    }
    if (!userLimiter.hit(`user:${sub}`)) return res.status(429).json({ message: "För många förfrågningar. Försök igen om en stund." });

    try {
      const email = await deps.getVerifiedEmail(sub);
      if (!email) return res.status(403).json({ message: "Din e-postadress är inte verifierad." });

      const r = await deps.bind({ clerkUserId: sub, email });

      // Only after COMMIT, only the first time; mailer never throws.
      if (r.changed) {
        await deps.mailer.send(r.ownerEmail, ownerWelcome({ name: r.ownerName, companyName: r.companyName, portalUrl: deps.portalUrl }));
      }
      return res.status(200).json({ verified: true, companyId: r.companyId, companyName: r.companyName, firstTime: r.changed });
    } catch (err) {
      const mapped = deps.classify(err);
      if (mapped) return res.status(mapped.status).json({ message: mapped.message });
      console.error(`[claims/verify] failed for ${sub}:`, err); // user id only, never the token
      return res.status(500).json({ message: "Verification failed" });
    }
  });
  return router;
}

/** Production wiring (kept separate from the router so tests need no DB or Clerk). */
export function productionVerifyDeps(p: {
  bind: VerifyDeps["bind"];
  mailer: Mailer;
  classify: VerifyDeps["classify"];
  getVerifiedEmail: VerifyDeps["getVerifiedEmail"];
}): VerifyDeps {
  return {
    getVerifier: () => {
      const secret = process.env.CLERK_JWT_SECRET;
      if (!secret) return null;
      return createHs256Verifier({
        secret,
        issuer: process.env.CLERK_JWT_ISSUER || undefined,
        allowedOrigins: parseOrigins(process.env.FRONTEND_ORIGIN),
      });
    },
    portalUrl: process.env.COMPANY_PORTAL_URL || "https://www.industrin.net/company/login",
    ...p,
  };
}
