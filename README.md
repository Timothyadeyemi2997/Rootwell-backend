# Rootwell — Backend

Backend API for Rootwell, a wellness-coaching platform: client bookings, coach scheduling, Stripe payments with escrow-style payouts, refund workflows, and an admin-managed content layer (testimonials, blog).

Frontend (marketing site + planned client/admin portals) lives in a separate `rootwell-frontend` repo — see the [full setup guide](#) for that side.

## Stack

- **Runtime:** Node.js, TypeScript
- **Framework:** Express
- **Database:** PostgreSQL, via Prisma 7 (driver adapters, `@prisma/adapter-pg`)
- **Auth:** Google OAuth (Passport) + email/password (Argon2), JWT in httpOnly cookies
- **Payments:** Stripe (Checkout, Connect, webhooks)
- **Email:** Nodemailer (Gmail SMTP for dev)
- **Scheduled jobs:** node-cron
- **Validation:** Zod

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Environment variables

Copy `.env.example` (or create `.env`) with:

```
DATABASE_URL=
PORT=4000
FRONTEND_URL=http://localhost:5173

JWT_SECRET=
JWT_REFRESH_SECRET=
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=30d

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost:4000/api/auth/google/callback

STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

EMAIL_USER=
EMAIL_PASS=
```

### 3. Database

```bash
npx prisma generate
npx prisma migrate dev
npx prisma db seed
```

Seeds two coaches (Amara Chen, Daniel Osei — login password `coachpass123`) and one program ("8-Week Energy Reset", $100).

### 4. Run

```bash
npm run dev        # dev server, http://localhost:4000
```

For Stripe webhooks locally, in a second terminal:
```bash
stripe listen --forward-to localhost:4000/api/webhooks/stripe
```
Copy the printed `whsec_...` into `STRIPE_WEBHOOK_SECRET`.

### 5. Health check

```
GET /health
```
Confirms the server is up and the database connection is live.

## What's built so far

### Auth
- Google OAuth + email/password registration/login
- JWT access + refresh tokens, httpOnly cookies
- Role-based access (`CLIENT`, `COACH`, `ADMIN`)

### Coaches
- Public coach directory with specialties, availability, completed-session count, average rating, and reviews
- Scheduling logic: availability-window + capacity matching, alternative-coach suggestions when no match

### Bookings
- Client booking creation (requires a paid `Order`)
- Coach-side reschedule, cancel, and transfer (transfer gated behind a $100 minimum net-earnings threshold)
- Full audit trail (`BookingLog`) on every action

### Payments
- Stripe Checkout session creation
- Webhook-driven order fulfillment (idempotent)
- 15% platform fee / 85% coach share, with 7.5% tax withheld from the coach's share, tracked per-payout

### Refund workflow
- Cron job detects cancellations left unresolved 48+ hours
- Coach approve/deny endpoint
- Approved refunds auto-process via Stripe after a 72-hour delay (separate cron job)

### Leads
- Rate-limited public capture endpoint (replaces third-party email-capture tools)

### Admin content
- Testimonials CRUD (public read of published only; full CRUD behind `ADMIN` role)
- Blog posts CRUD (same public/admin split, slug-based public lookup)

### Logging
- Every HTTP request logged (`RequestLog`)
- Every booking-state-changing action logged with who/why (`BookingLog`)

## Not yet built

- Admin leads/logs read endpoints
- Client portal (plan/progress view)
- Stripe Connect onboarding + coach withdrawals
- Dual (client + coach) session completion → review submission
- Frontend (TypeScript/Tailwind conversion of the marketing site, portal, and admin UI)

## Project structure

```
src/
├── config/        # prisma, passport, stripe, mailer
├── controllers/    # request handlers
├── services/       # business logic (scheduling, payouts, mail, etc.)
├── middleware/      # auth, role checks, error handling, rate limiting, logging
├── routes/         # one file per resource
├── jobs/           # cron jobs (refund deadline check, refund processor)
├── types/          # shared/augmented types
├── utils/          # ApiError, jwt, cookies
└── generated/prisma # Prisma client output (gitignored)
prisma/
├── schema.prisma
├── migrations/
└── seed.ts
```

## Notes for local dev

- Prisma 7 requires the explicit `driverAdapters` preview feature and a `pg` adapter — see `src/config/prisma.ts`.
- The Stripe webhook route uses `express.raw()`, mounted **before** the global `express.json()` middleware — required for signature verification.
- Seeded coaches have `oauthProvider: "seed"` and a real password hash, so they can be logged into directly for testing coach-only routes.