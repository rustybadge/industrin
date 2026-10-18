// Run: node --import ./tests/ts-resolve.mjs --test --test-force-exit tests/claims-verify.test.ts
import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import jwt from "jsonwebtoken";
import type { AddressInfo } from "node:net";
import { AuthError, createHs256Verifier, createVerifyRouter, type VerifyDeps } from "../server/claims/verify";
import { createLimiter } from "../server/http/rate-limit";
import { corsFromEnv, parseOrigins } from "../server/http/cors";
import { claimApproved, claimConfirmation, claimReceivedAdmin, claimRejected, ownerWelcome } from "../server/emails/templates";
import { safeUrl } from "../server/emails/html";

// Throwaway keys generated for these tests only; not real credentials.
const SECRET = "test-only-signing-key-0123456789abcdef";
const OTHER = "a-different-test-only-key-fedcba9876543210";
const ORIGIN = "https://app.example.test";
process.env.FRONTEND_ORIGIN = ORIGIN + "/"; // trailing slash must be tolerated

const sign = (claims: object = {}, secret = SECRET, opts: jwt.SignOptions = {}) =>
  jwt.sign({ sub: "user_abc", ...claims }, secret, { algorithm: "HS256", expiresIn: 300, ...opts });

class DomainConflict extends Error {}
class DomainNoClaim extends Error {}

function harness(over: Partial<VerifyDeps> = {}, state = { changed: true }) {
  const binds: any[] = [];
  const sent: { to: string; subject: string; html: string }[] = [];
  const deps: VerifyDeps = {
    getVerifier: () => createHs256Verifier({ secret: SECRET, allowedOrigins: parseOrigins(ORIGIN) }),
    getVerifiedEmail: async () => "owner@acme.se",
    bind: async (p) => { binds.push(p); return { companyId: "c1", companyName: "Acme <AB>", ownerName: "Anna", ownerEmail: p.email, changed: state.changed }; },
    mailer: { async send(to, e) { sent.push({ to, ...e }); return true; } },
    portalUrl: "https://portal.test/login",
    classify: (e) => e instanceof DomainNoClaim ? { status: 403, message: "no claim" } : e instanceof DomainConflict ? { status: 409, message: "conflict" } : null,
    ...over,
  };
  const app = express();
  app.use("/api/claims/verify", createVerifyRouter(deps));
  const server = app.listen(0);
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/claims/verify`;
  return { url, binds, sent, state, close: () => server.close() };
}
const post = (url: string, token?: string, headers: Record<string, string> = {}) =>
  fetch(url, { method: "POST", headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), ...headers } });

test("token verifier: accepts good token; rejects forged, expired, alg=none, wrong alg, no exp, bad sub, wrong azp/iss", () => {
  const v = createHs256Verifier({ secret: SECRET, issuer: "https://clerk.test", allowedOrigins: [ORIGIN] });
  const good = sign({ iss: "https://clerk.test", azp: ORIGIN });
  assert.equal(v(good).sub, "user_abc");
  assert.throws(() => v(sign({ iss: "https://clerk.test" }, OTHER)), AuthError, "forged signature");
  assert.throws(() => v(sign({ iss: "https://clerk.test" }, SECRET, { expiresIn: -60 })), AuthError, "expired");
  assert.throws(() => v(jwt.sign({ sub: "user_abc", iss: "https://clerk.test" }, "", { algorithm: "none" as any, expiresIn: 300 })), AuthError, "alg none");
  assert.throws(() => v(sign({ iss: "https://clerk.test" }, SECRET, { algorithm: "HS384" })), AuthError, "wrong HMAC alg");
  assert.throws(() => v(jwt.sign({ sub: "user_abc", iss: "https://clerk.test" }, SECRET, { algorithm: "HS256" })), AuthError, "no exp");
  assert.throws(() => v(sign({ iss: "https://clerk.test", sub: "admin" })), AuthError, "bad sub");
  assert.throws(() => v(sign({ iss: "https://evil.test" })), AuthError, "wrong issuer");
  assert.throws(() => v(sign({ iss: "https://clerk.test", azp: "https://evil.test" })), AuthError, "wrong azp");
});

test("401 for missing / malformed / forged / expired token, and nothing is bound", async () => {
  const h = harness();
  assert.equal((await post(h.url)).status, 401);
  assert.equal((await post(h.url, "not-a-jwt")).status, 401);
  assert.equal((await post(h.url, sign({}, OTHER))).status, 401);
  assert.equal((await post(h.url, sign({}, SECRET, { expiresIn: -60 }))).status, 401);
  assert.equal(h.binds.length, 0);
  assert.equal(h.sent.length, 0);
  h.close();
});

test("503 when CLERK_JWT_SECRET is not configured", async () => {
  const h = harness({ getVerifier: () => null });
  assert.equal((await post(h.url, sign())).status, 503);
  h.close();
});

test("403 when Clerk email is not verified; bind never reached", async () => {
  const h = harness({ getVerifiedEmail: async () => null });
  assert.equal((await post(h.url, sign())).status, 403);
  assert.equal(h.binds.length, 0);
  h.close();
});

test("403 without an approved claim, 409 on conflicting account; no email sent", async () => {
  let err: Error = new DomainNoClaim();
  const h = harness({ bind: async () => { throw err; } });
  assert.equal((await post(h.url, sign())).status, 403);
  err = new DomainConflict();
  assert.equal((await post(h.url, sign())).status, 409);
  assert.equal(h.sent.length, 0);
  h.close();
});

test("first call binds, flags verified and sends ONE escaped Swedish welcome; repeat is idempotent with no email", async () => {
  const h = harness();
  const r1 = await post(h.url, sign({ azp: ORIGIN }));
  assert.equal(r1.status, 200);
  assert.deepEqual(await r1.json(), { verified: true, companyId: "c1", companyName: "Acme <AB>", firstTime: true });
  assert.deepEqual(h.binds[0], { clerkUserId: "user_abc", email: "owner@acme.se" });
  assert.equal(h.sent.length, 1);
  assert.equal(h.sent[0].to, "owner@acme.se");
  assert.match(h.sent[0].subject, /Välkommen/);
  assert.ok(h.sent[0].html.includes("Acme &lt;AB&gt;") && !h.sent[0].html.includes("<AB>"));

  h.state.changed = false;
  const r2 = await post(h.url, sign());
  assert.equal(r2.status, 200);
  assert.equal((await r2.json()).firstTime, false);
  assert.equal(h.sent.length, 1, "no second email");
  h.close();
});

test("email failure never fails the verification", async () => {
  const h = harness({ mailer: { async send() { return false; } } });
  assert.equal((await post(h.url, sign())).status, 200);
  h.close();
});

test("the client cannot choose the company: body/query/headers are ignored", async () => {
  const h = harness();
  await fetch(h.url + "?companyId=evil", { method: "POST", headers: { authorization: `Bearer ${sign()}`, "content-type": "application/json", "x-company-id": "evil" }, body: JSON.stringify({ companyId: "evil", email: "evil@x.se" }) });
  assert.deepEqual(h.binds[0], { clerkUserId: "user_abc", email: "owner@acme.se" });
  h.close();
});

test("rate limits: per-user (429) and per-IP", async () => {
  const h = harness({ userLimiter: createLimiter(2, 60_000), ipLimiter: createLimiter(100, 60_000) });
  const t = sign();
  assert.equal((await post(h.url, t)).status, 200);
  assert.equal((await post(h.url, t)).status, 200);
  assert.equal((await post(h.url, t)).status, 429);
  h.close();
  const g = harness({ ipLimiter: createLimiter(1, 60_000) });
  assert.equal((await post(g.url)).status, 401);
  assert.equal((await post(g.url)).status, 429);
  g.close();
});

test("CORS: FRONTEND_ORIGIN allowed (trailing slash tolerated), others get no headers, preflight handled, never wildcard", async () => {
  const h = harness();
  const ok = await fetch(h.url, { method: "OPTIONS", headers: { origin: ORIGIN, "access-control-request-method": "POST" } });
  assert.equal(ok.status, 204);
  assert.equal(ok.headers.get("access-control-allow-origin"), ORIGIN);
  const bad = await fetch(h.url, { method: "OPTIONS", headers: { origin: "https://evil.test" } });
  assert.equal(bad.status, 403);
  assert.equal(bad.headers.get("access-control-allow-origin"), null);
  const real = await post(h.url, sign(), { origin: "https://evil.test" });
  assert.equal(real.headers.get("access-control-allow-origin"), null);
  const withOk = await post(h.url, sign(), { origin: ORIGIN });
  assert.equal(withOk.headers.get("access-control-allow-origin"), ORIGIN);
  h.close();
  // unset env => nothing allowed
  const app = express();
  app.use(corsFromEnv(() => undefined));
  app.post("/", (_q, r) => r.json({}));
  const s = app.listen(0);
  const res = await fetch(`http://127.0.0.1:${(s.address() as AddressInfo).port}/`, { method: "POST", headers: { origin: ORIGIN } });
  assert.equal(res.headers.get("access-control-allow-origin"), null);
  s.close();
});

test("email templates escape every dynamic value", () => {
  const evil = `<img src=x onerror=alert(1)>"&'`;
  for (const m of [
    claimReceivedAdmin({ companyName: evil, claimantName: evil, claimantEmail: evil, phone: evil, message: evil, adminUrl: "https://a.test/admin" }),
    claimConfirmation({ name: evil, companyName: evil }),
    claimApproved({ name: evil, companyName: evil, portalUrl: "https://a.test" }),
    claimRejected({ name: evil, companyName: evil }),
    ownerWelcome({ name: evil, companyName: evil, portalUrl: "https://a.test" }),
  ]) {
    assert.ok(!m.html.includes("<img"), `unescaped markup in: ${m.subject}`);
    assert.ok(m.html.includes("&lt;img"));
  }
  assert.equal(safeUrl("javascript:alert(1)"), "#");
});
