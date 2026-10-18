# Industrin.net — Agent Development Rules

This file is read automatically by Hermes Agent, Claude Code, Codex, and other AI coding
agents when working in this repository. All agents must follow these rules without exception.

---

## 1. Understand the project first

- Read CLAUDE.md and ARCHITECTURE.md before starting any task.
- Preserve all existing services: Render (backend), Neon (database), Clerk (auth),
  Netlify (frontend), Resend (email). Do not replace or migrate infrastructure without
  explicit approval from the project owner.
- The production site is www.industrin.net. Treat it as live and customer-facing at all times.

---

## 2. Development

- Always work on a dedicated Git feature branch. Never commit directly to `main` or `staging`.
- Branch naming: `feat/short-description`, `fix/short-description`, `chore/short-description`.
- Make requested changes autonomously and completely — do not stop at stubs or partial work.
- Run the following checks before declaring any task done:
  - TypeScript: `./node_modules/.bin/tsc --noEmit`
  - Build: `npm run build`
- Fix any errors you introduce before committing.
- Do not break existing functionality. If a change touches auth, search, or the claim flow,
  verify those paths still work.
- The UI language is Swedish. Keep all user-facing text in Swedish.
- Follow the existing code conventions (TypeScript everywhere, conventional commits,
  shadcn/ui components untouched, shared/schema.ts shared between frontend and backend).

---

## 3. GitHub

- Commit completed work with a descriptive conventional commit message
  (`feat:`, `fix:`, `chore:`, `refactor:`).
- Push the feature branch to GitHub (origin).
- Open a pull request targeting `main` with a plain-English description of what changed and why.
- Never merge into `main` without explicit written approval from the project owner.
- Never force-push to any branch.
- Never delete a branch without explicit approval.

---

## 4. Deployment

- Never deploy to production (Netlify / Render) without explicit approval from the project owner.
- Never run destructive database operations (DROP, DELETE, truncate, irreversible migrations)
  without explicit approval.
- Before any operation that could affect production data or availability, clearly explain the
  risk and wait for approval.
- Schema changes must be discussed before being applied. Prefer `drizzle-kit generate` +
  `drizzle-kit migrate` over `drizzle-kit push` for production-safe changes.

---

## 5. Communication

- Communicate in plain English. Avoid unnecessary technical jargon.
- When a task is complete, provide a summary covering:
  - What changed
  - What was tested and what the result was
  - Anything that failed or was left unresolved
  - The GitHub pull request link
  - Whether the changes are ready for production
- If anything is unclear or requires a decision, ask before proceeding.

---

## 6. Environment variables

Never commit secrets. Environment variables are managed in:
- Local development: `.env` (gitignored)
- Frontend (Netlify): Netlify dashboard → Site configuration → Environment variables
- Backend (Render): Render dashboard → Environment

Key variables (see ARCHITECTURE.md for the full list):
- `DATABASE_URL` — Neon PostgreSQL connection string
- `CLERK_SECRET_KEY`, `VITE_CLERK_PUBLISHABLE_KEY` — Clerk auth
- `RESEND_API_KEY` — transactional email
- `GITHUB_TOKEN` — available via `/data/.env` for git push operations (source it before use)

---

## 7. Pushing to GitHub from this environment

The `GITHUB_TOKEN` is stored in `/data/.env` and must be sourced before any `git push`.
Use HTTPS with the token embedded in the remote URL:

```bash
set -a && source /data/.env && set +a
git push "https://rustybadge:${GITHUB_TOKEN}@github.com/rustybadge/industrin.git" <branch>:<branch>
```

Never hardcode the token in any file.
