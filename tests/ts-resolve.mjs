// Lets `node --test` import extensionless .ts sources (tsx is not required to run these tests).
import { register } from 'node:module';
register('data:text/javascript,' + encodeURIComponent(`
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
export async function resolve(spec, ctx, next) {
  if (spec.startsWith('@shared/')) { const u = new URL('../shared/' + spec.slice(8) + '.ts', 'file:///data/industrin/tests/x.mjs'); return next(u.href, ctx); }
  if (spec.startsWith('.') && !/\\.[cm]?[jt]s$/.test(spec) && ctx.parentURL) {
    const u = new URL(spec + '.ts', ctx.parentURL);
    if (existsSync(fileURLToPath(u))) return next(u.href, ctx);
  }
  return next(spec, ctx);
}`));
