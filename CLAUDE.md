# Industrin.net — Sveriges Serviceföretagsregister

## What This Is
A Swedish B2B industrial company directory at industrin.net. Businesses can find service companies,
and companies can claim and manage their own listings.

## Tech Stack
- **Frontend:** React + TypeScript
- **Backend:** Express (hosted on Render)
- **Database:** PostgreSQL via Neon (serverless)
- **Auth:** Clerk (handles all auth + invitation flow)
- **Email:** Resend (transactional email)
- **Hosting:** Netlify (frontend) → Render (backend) → Neon (DB)
- **Source control:** GitHub (rustybadge/industrin)

## Deployment Topology
```
User → Netlify (React frontend)
           ↓
       Render (Express API)
           ↓
       Neon (PostgreSQL)
```

## Database Schema (key tables)
- `companies` — the core directory listings
- `claim_requests` — when a business claims their listing
- `company_users` — links Clerk users to companies post-claim
- `company_profiles` — extended profile data (Phase 2)
- `email_templates` — for automated emails (Phase 2)

## Auth Model
- Clerk handles ALL authentication — never build custom auth
- Clerk user IDs are the foreign key reference in Neon
- Admin access managed via Clerk invitation flow
- JWT expiry set to 30 days (extended from default)

## Email
- All transactional email goes through Resend
- Post-claim approval emails are a key upcoming feature (Phase 2)
- Secure token links used for profile completion flow

## Key Workflows
1. **Company claim flow:** User finds listing → requests claim → admin approves → user gets login access
2. **Admin panel:** Manage claims, company users, settings, bulk actions
3. **Quote requests:** Routed through the platform (email addresses hidden from scrapers)

## Current State
- Core directory + search: DONE
- Claim workflow + admin panel: DONE
- Company Users management UI: DONE
- Email automation (Resend integration): IN PROGRESS (Phase 2)
- Contact form replacing direct email links: PLANNED

## Phase 2 Priorities
1. Resend email automation after claim approval
2. Profile completion page with secure token link
3. Bulk admin actions
4. Analytics
5. Replace direct email links with "Skicka e-post" contact form

## Conventions
- TypeScript for all new files
- Conventional commits: `feat:`, `fix:`, `chore:`, `refactor:`
- Swedish-language UI (the product is Swedish)
- Keep emails hidden from scrapers — route through platform

## Environment Variables (never commit these)
- Neon DB connection string
- Clerk publishable + secret keys
- Resend API key
- Any Render/Netlify env config

## Commands
- Dev: `npm run dev`
- Build: `npm run build`
- Deploy: push to main → auto-deploys via Netlify (frontend) / Render (backend)

## Known Tech Debt
- See ARCHITECTURE.md for full list
- Historical notes in replit.md (from Replit era, pre-Netlify migration)
