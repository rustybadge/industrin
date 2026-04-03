# Industrin.net — Architecture & Developer Guide

A reference document for developers picking up this codebase.

---

## What the site does

**Industrin.net** is a Swedish industrial services directory. It lists 1,000+ small-to-medium Swedish companies offering aftermarket services — repairs, spare parts, CNC machining, hydraulics, automation, etc.

**Core user flows:**
1. **Visitor** — browses and searches company listings, sends quote/inquiry requests
2. **Company owner** — claims their listing to manage their profile
3. **Admin** — reviews and approves claim requests via a private dashboard

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript, Vite |
| Routing | Wouter (lightweight React Router alternative) |
| State / data fetching | TanStack Query (React Query) |
| UI components | shadcn/ui (Radix UI primitives + Tailwind CSS) |
| Backend | Express.js + TypeScript |
| Database | PostgreSQL via Neon (serverless) |
| ORM | Drizzle ORM |
| Authentication | Clerk |
| Hosting (frontend) | Netlify |
| Hosting (backend) | Render |
| Repo / CI | GitHub |

---

## Deployment architecture

```
Browser
  │
  ├── https://www.industrin.net  (Netlify — static React build)
  │     │
  │     └── /api/*  →  proxied to  →  https://industrin-api.onrender.com
  │                                        (Express.js server on Render)
  │                                              │
  │                                              └── Neon PostgreSQL (cloud)
  │
  └── Clerk (external SaaS — handles all authentication)
```

**Important:** Render's free tier spins the backend down after inactivity. The first visitor after a quiet period will see a ~3-5 second loading delay while it wakes up. This is normal behaviour.

**Branches:**
- `main` → deploys to production (www.industrin.net)
- `staging` → deploys to staging preview on Netlify (for testing before going live)

---

## Folder structure

```
├── client/                   # React frontend (built by Vite)
│   └── src/
│       ├── main.tsx          # Entry point — mounts Clerk + App
│       ├── App.tsx           # Router + global providers
│       ├── pages/            # One file per page/route
│       │   ├── home.tsx              # Homepage with company listings
│       │   ├── companies.tsx         # Full company directory
│       │   ├── company-profile.tsx   # Individual company page
│       │   ├── claim-request.tsx     # Company claim form
│       │   ├── quote-request.tsx     # Quote request form (per company)
│       │   ├── general-quote-request.tsx  # General inquiry form
│       │   ├── admin-login.tsx       # Admin login page
│       │   ├── admin-dashboard.tsx   # Admin panel (claim approvals)
│       │   ├── admin-settings.tsx    # Admin settings + user management
│       │   ├── company-login.tsx     # Company owner login
│       │   ├── company-dashboard.tsx # Company owner portal
│       │   └── integritetspolicy.tsx # Privacy policy
│       ├── components/
│       │   ├── layout/       # Header, Footer
│       │   ├── company/      # CompanyCard and related components
│       │   ├── search/       # SmartSearch, SortOptions, FacetedSearch
│       │   └── ui/           # shadcn/ui base components (don't edit these)
│       ├── lib/
│       │   ├── api.ts        # All API call functions
│       │   └── queryClient.ts # TanStack Query setup + fetch wrapper
│       ├── hooks/            # Custom React hooks
│       └── utils/            # Utility functions
│
├── server/                   # Express backend (runs on Render)
│   ├── index.ts              # Server entry — sets up Express + Clerk middleware
│   ├── routes.ts             # ALL API route handlers (single file)
│   ├── storage.ts            # Database access layer (interface + implementation)
│   └── db.ts                 # Drizzle + Neon database connection
│
├── shared/
│   └── schema.ts             # Database schema (Drizzle) + Zod types
│                             # Shared between frontend and backend
│
├── scripts/                  # One-off utility scripts (run with npx tsx)
├── migrations/               # Drizzle migration files
├── data/                     # Raw company data (JSON) used for seeding
├── tests/                    # Playwright E2E tests
│
├── netlify.toml              # Netlify build config + /api/* proxy redirect
├── drizzle.config.ts         # Drizzle ORM config
├── vite.config.ts            # Vite build config
└── .env                      # Local environment variables (never commit)
```

---

## Database schema

Defined in `shared/schema.ts`. All tables use UUID primary keys.

### `companies`
The core table. 1,067 companies as of April 2026.

| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| name | text | Company name |
| slug | text | URL slug (unique) |
| description | text | English description |
| description_sv | text | Swedish description |
| categories | text[] | e.g. ["CNC", "Hydraulik"] |
| services | text[] | Specific services offered |
| serviceområden | text[] | Geographic service areas |
| location / region | text | City and region |
| contactEmail / phone / website | text | Contact info |
| isFeatured | boolean | "Utmärkt" badge |
| isVerified | boolean | "Verifierat" badge |
| clerkOrganizationId | text | Links to Clerk org (set when claim approved) |

### `claim_requests`
When a company owner submits a claim for their listing.

| Column | Notes |
|---|---|
| companyId | Which company they're claiming |
| name / email / phone | Claimant contact info |
| status | pending → approved or rejected |
| reviewedBy | Admin user who actioned it |

### `company_users`
Company owners who have been granted access to a listing.

| Column | Notes |
|---|---|
| companyId | Which company they manage |
| email | Must match their Clerk account |
| accessToken | Legacy token (see Tech Debt section) |
| clerkUserId | Their Clerk user ID |
| isActive | Whether access is currently active |

### `quote_requests`
Visitor inquiries sent to a specific company.

### `general_quote_requests`
Visitor inquiries not tied to a specific company (from the /begar-offert page).

### `users`
Admin accounts only. Company owners use Clerk, not this table.

### `service_categories` + `company_services`
Hierarchical service category taxonomy. Companies can be tagged with multiple categories.

---

## Authentication

The app uses **Clerk** as its authentication provider.

### How it works

**Company owners:**
1. Owner submits a claim request via the public form
2. Admin reviews the claim in `/admin` and approves it
3. On approval, the server:
   - Creates (or finds) a Clerk Organization for the company
   - If the owner already has a Clerk account → adds them to the org
   - If not → sends them a Clerk invitation email
4. Owner clicks the email link, creates a Clerk account, and is added to the org
5. Owner can now log in at `/company/login` and access their dashboard

**Admins:**
- Admin accounts are stored in the `users` table in the database
- They log in at `/admin/login` with username + password
- This is a **custom auth system** separate from Clerk (see Tech Debt)

### Clerk session claims
The app uses a custom Clerk JWT template called `industrin-session` that embeds:
- `role` — "admin" or "company"
- `companyId` — the Neon database company UUID

These are read on the server in `routes.ts` via `getAuth(req).sessionClaims`.

---

## API routes

All defined in `server/routes.ts`.

### Public (no auth required)
| Method | Path | Description |
|---|---|---|
| GET | `/api/companies` | List companies (supports search, region, categories, limit, offset) |
| GET | `/api/companies/:slug` | Get company by slug |
| GET | `/api/company-profile/:id` | Get company by ID |
| GET | `/api/categories` | List all categories |
| GET | `/api/regions` | List all regions |
| POST | `/api/quote-requests` | Submit a quote request |
| POST | `/api/companies/:companyId/claim` | Submit a claim request |

### Company owner (requires Clerk session with company role)
| Method | Path | Description |
|---|---|---|
| GET | `/api/company/profile` | Get own company profile |
| PUT | `/api/company/profile` | Update own company profile |
| GET | `/api/company/quote-requests` | View quote requests for own company |

### Admin (requires Clerk session with admin role)
| Method | Path | Description |
|---|---|---|
| GET/POST | `/api/admin/...` | Claim approvals, user management, stats |

---

## Environment variables

| Variable | Where used | Description |
|---|---|---|
| `DATABASE_URL` | Server | Neon PostgreSQL connection string |
| `VITE_CLERK_PUBLISHABLE_KEY` | Frontend (build time) | Clerk public key |
| `CLERK_PUBLISHABLE_KEY` | Server | Same key, for server middleware |
| `CLERK_SECRET_KEY` | Server | Clerk secret for API calls |
| `VITE_CLERK_JWT_TEMPLATE_NAME` | Frontend | JWT template name (`industrin-session`) |
| `APP_URL` | Server | Base URL for Clerk redirect emails |
| `COMPANY_PORTAL_URL` | Server | Company dashboard URL for invitations |
| `JWT_SECRET` | Server | Legacy — can be removed (see Tech Debt) |

Set in:
- **Local development:** `.env` file (never commit this)
- **Production:** Netlify dashboard → Site configuration → Environment variables
- **Backend (Render):** Render dashboard → Environment

---

## Running locally

```bash
# Install dependencies
npm install

# Start dev server (frontend + backend together on port 5000)
npm run dev

# Check TypeScript
npm run check

# Push schema changes to database
npm run db:push

# Run E2E tests (requires dev server running)
npm run test:e2e
```

---

## Deployment

**Frontend (Netlify):**
- Push to `main` → auto-deploys to www.industrin.net
- Push to `staging` → auto-deploys to staging preview URL
- Build command: `npm run build`
- Publish directory: `dist/public`

**Backend (Render):**
- The Express server lives at https://industrin-api.onrender.com
- Currently deployed manually or via its own GitHub connection
- Netlify proxies all `/api/*` requests to Render (configured in `netlify.toml`)

---

## Tech debt / known issues

These are areas a developer should be aware of and plan to address:

### 1. Dual auth system (priority: high)
The admin login system (`/admin/login`) uses a custom username/password + JWT approach stored in the `users` table. This is separate from Clerk and predates it. It should eventually be migrated to use Clerk for admin accounts too. Related unused code: `JWT_SECRET` env var, `bcrypt`, `passport`, `passport-local`, `jsonwebtoken`, `express-session`, `memorystore`, `connect-pg-simple`.

### 2. Legacy `accessToken` on company_users (priority: medium)
The `company_users` table has an `accessToken` column from an earlier token-based auth system. Clerk now handles company auth, so this column is redundant. It can be removed once confirmed unused.

### 3. Split deployment adds cold-start latency (priority: medium)
Frontend (Netlify) and backend (Render) are separate services. Render's free tier spins down after inactivity, causing ~3-5 second delays for first visitors. Options: upgrade to Render paid tier, or migrate the backend to Netlify Functions.

### 4. No database migration history (priority: medium)
The project uses `drizzle-kit push` to sync the schema directly. This works but doesn't produce a migration history. Switch to `drizzle-kit generate` + `drizzle-kit migrate` for production-safe schema changes.

### 5. Oversized dependency list (priority: low)
Many packages in `package.json` appear unused (`passport`, `ws`, `embla-carousel-react`, `connect-pg-simple`, `memorystore`, etc.). A cleanup pass would reduce bundle size and simplify the dependency tree.

### 6. All API routes in one file (priority: low)
`server/routes.ts` handles all endpoints in a single file. As the API grows, splitting into separate route modules (e.g. `routes/companies.ts`, `routes/admin.ts`) will improve maintainability.

---

## Key things to know

- **Swedish characters** — the search system handles å, ä, ö correctly. Be careful not to break this if modifying search logic.
- **`shared/schema.ts` is imported by both frontend and backend** — changes there affect both sides.
- **The `ui/` component folder** — these are shadcn/ui generated components. Don't edit them directly; use the shadcn CLI to add/update them.
- **Company slugs** — used in URLs (`/companies/:slug`) and must remain unique. The slugify function is in `routes.ts`.
- **`isFeatured` / `isVerified`** — these control the "Utmärkt" and "Verifierat" badges shown on company cards and affect sort order (featured companies appear first).
