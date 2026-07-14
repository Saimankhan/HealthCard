# HealthCard

A digital healthcare management platform — patient/doctor/admin portals,
appointment booking, prescriptions, medical records, a QR-verified digital
HealthCard, Stripe-backed payments, analytics, and report export.

> **Status:** v1.0.0 — feature-complete, tested, and CI-gated. Built for a
> **local demonstration** (`npm run dev` on `localhost:3000`); not deployed.

## Table of contents

- [Tech stack](#tech-stack)
- [Architecture](#architecture)
- [Folder structure](#folder-structure)
- [Feature list](#feature-list)
- [API overview](#api-overview)
- [Local setup guide](#local-setup-guide)
- [Environment variables](#environment-variables)
- [Demo accounts & data](#demo-accounts--data)
- [Scripts](#scripts)
- [Continuous integration](#continuous-integration)
- [Docker](#docker)
- [Security notes](#security-notes)

## Tech stack

| Layer     | Choice                                        |
| --------- | --------------------------------------------- |
| Framework | Next.js 15 (App Router) + TypeScript          |
| UI        | Tailwind CSS v4 + shadcn/ui                   |
| Backend   | Next.js Route Handlers                        |
| Database  | PostgreSQL (Neon), 18 models                  |
| ORM       | Prisma 7 (Neon serverless driver adapter)     |
| Auth      | Better Auth (email/password, sessions, RBAC)  |
| Cache     | Upstash Redis (REST)                          |
| Storage   | Cloudflare R2 (S3-compatible, presigned URLs) |
| Email     | Gmail SMTP via Nodemailer                     |
| SMS       | Twilio (optional)                             |
| Payments  | Stripe (test mode only)                       |
| Testing   | Vitest, 107 tests                             |
| CI        | GitHub Actions                                |
| Container | Docker / docker-compose                       |

## Architecture

Layered, feature-based modules — each business feature is a vertical slice
that owns its own routes/services/repository/validation, and everything
cross-cutting (auth, cache, db, storage, email, sms, payments, security)
lives in `src/core`:

```
Request → route handler (src/app/api/**/route.ts, thin)
        → routes.ts (auth check, validation, calls service)
        → service (business logic, RBAC assertions, orchestration)
        → repository (Prisma queries only)
        → Postgres (Neon)
```

Services never call Prisma directly, and route handlers never contain
business logic — every mutation that matters writes an audit log entry via
the shared `writeAuditLog` helper, and every route response goes through the
same `{success, data|error}` envelope (`src/core/api/response.ts`).

## Folder structure

```
src/
  app/                     UI layer — Next.js App Router routes, layouts, pages
    (auth)/                login/register/password-reset (public)
    admin/, doctor/, patient/   role-gated dashboards (middleware-protected)
    api/                    ~90 REST route handlers, grouped by feature
    verify/[token]/         public QR-verification landing page
  components/
    ui/                     shadcn/ui primitives
    admin/, doctor/, patient/   role-specific components
  core/                    cross-cutting infrastructure singletons
    auth/                  Better Auth instance, RBAC helpers, ownership guards
    cache/                 Upstash Redis client + cache-aside helper
    config/                zod-validated server/client env
    db/                    Prisma client singleton (Neon adapter)
    email/, sms/           Nodemailer / Twilio transports + templates
    payments/              Stripe server instance
    storage/               Cloudflare R2 client + signed URL helpers
    security/              rate limiting
    api/                   shared response envelope, error handler, pagination
  features/<feature>/      one module per business feature
    routes/                route-handler logic (thin controllers)
    services/               application layer — use cases, RBAC, orchestration
    repository/             infrastructure layer — Prisma-backed data access
    validation/              zod schemas
    *.test.ts                Vitest unit/integration tests
  hooks/                   shared client-side hooks (e.g. list/filter fetching)
  lib/                     generic helpers (formatting, PDF/CSV/Excel export, cn)
  middleware.ts            route-protection gate (session cookie check)

prisma/
  schema/                  multi-file Prisma schema (18 models)
  migrations/              generated SQL migrations
  seed.ts                  demo data seeding (see below)
```

## Feature list

- **Auth & RBAC** — email/password via Better Auth, email verification,
  password reset, session cookies, four roles (`PATIENT`, `DOCTOR`, `ADMIN`,
  `SUPER_ADMIN`), per-route/per-record authorization.
- **Patients / Doctors / Admin** — full CRUD, profile management, avatar
  upload, search & filters (name, email, phone, blood group, specialization).
- **Appointments** — booking with double-booking conflict detection,
  reschedule, cancel, status transitions, automated reminder + expiry cron
  jobs.
- **Prescriptions & Medical History** — doctor-authored records scoped to an
  existing doctor-patient relationship.
- **Medical Reports** — presigned-upload file attachments (Cloudflare R2),
  ownership-verified download URLs.
- **Digital HealthCard + QR** — auto-issued on patient registration, on-demand
  QR code generation, a public PII-redacted verification page
  (`/verify/[token]`), reissue (token rotation), printable/downloadable PDF.
- **Payments** — Stripe Checkout, webhook-driven status sync, refunds,
  receipts.
- **Notifications** — in-app + email/SMS fan-out, delivery-retry cron,
  admin broadcast.
- **Reports & Analytics** — patient/doctor/appointment/payment/prescription
  dashboards, daily-active-users, period-over-period growth, CSV/PDF/Excel
  export.
- **Redis caching** — cache-aside pattern on read-heavy list/lookup
  endpoints, with invalidation on writes and a Redis-outage fallback.
- **Audit logging** — every security-relevant mutation (role changes,
  suspensions, health-card status, payment transitions, etc.) is recorded.

## API overview

All ~90 endpoints under `src/app/api/**` return the same envelope
(`{success: true, data, meta?}` or `{success: false, error}`), grouped by
feature:

| Area                                   | Example routes                                                       | Auth                                                                             |
| -------------------------------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Auth                                   | `/api/auth/[...all]` (Better Auth catch-all), `/api/auth/me`         | Public / session                                                                 |
| Patients, Doctors, Admin, Users        | `/api/patients`, `/api/doctors`, `/api/users/[id]/role`              | Session + role-scoped                                                            |
| Appointments                           | `/api/appointments`, `/api/appointments/[id]/reschedule`             | Session, ownership-checked                                                       |
| Prescriptions, Medical History/Reports | `/api/prescriptions`, `/api/medical-reports/upload-url`              | Session, doctor-patient relationship required                                    |
| HealthCard / QR                        | `/api/health-cards/me/qr`, `/api/health-cards/public-verify/[token]` | Mixed — the verify endpoint is deliberately public + rate-limited + PII-redacted |
| Payments                               | `/api/payments/[id]/checkout`, `/api/webhooks/stripe`                | Session / Stripe signature                                                       |
| Notifications                          | `/api/notifications`, `/api/notifications/broadcast`                 | Session, broadcast is admin + rate-limited                                       |
| Reports & Export                       | `/api/reports/dashboard`, `/api/reports/export/[domain]`             | Admin only                                                                       |
| Departments/Specializations            | `/api/departments`, `/api/specializations`                           | Session (read) / Admin (write), cached                                           |
| Cron                                   | `/api/cron/*`                                                        | Bearer token (`CRON_SECRET`)                                                     |
| Health                                 | `/api/health`                                                        | Public                                                                           |

## Local setup guide

Prerequisites: Node.js 20+, npm, and accounts for Neon (Postgres), Upstash
(Redis), Cloudflare R2, a Gmail app password, and a Stripe test account.
(Twilio is optional — SMS sends are skipped, not failed, if unconfigured.)

```bash
# 1. Install dependencies
npm install

# 2. Configure environment variables
cp .env.example .env
# then fill in .env with real values — see "Environment variables" below

# 3. Apply database migrations
npm run db:migrate

# 4. Seed demo data (admin/doctor/patient accounts + sample records)
npm run db:seed

# 5. Run the dev server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) and sign in with one of
the [demo accounts](#demo-accounts--data).

To verify a production build works locally instead:

```bash
npm run build
npm run start
```

### Clean-environment check

`npm ci` (rather than `npm install`) reproduces a byte-for-byte install from
`package-lock.json` and is what CI uses — run it if you want to confirm the
project installs cleanly the way a fresh clone would.

## Environment variables

See `.env.example` for the full annotated list (every variable there is
required unless marked optional, and matches what `src/core/config/env.server.ts`
/ `env.client.ts` validate at startup — the app will refuse to boot with a
clear error if something required is missing). Summary:

| Variable group                                       | Purpose                                               |
| ---------------------------------------------------- | ----------------------------------------------------- |
| `DATABASE_URL`, `DIRECT_URL`                         | Neon Postgres (pooled vs. direct connection)          |
| `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`              | Session signing + base URL                            |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Cache + rate limiting                                 |
| `R2_*`                                               | Cloudflare R2 file storage (avatars, medical reports) |
| `SMTP_*`                                             | Gmail SMTP for transactional email                    |
| `STRIPE_*`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`     | Payments (test mode only)                             |
| `TWILIO_*`                                           | SMS (optional)                                        |
| `CRON_SECRET`                                        | Bearer token securing `/api/cron/*`                   |
| `NEXT_PUBLIC_APP_URL`                                | Base URL used in emails, QR codes, Stripe redirects   |

## Demo accounts & data

`npm run db:seed` creates (idempotently — safe to re-run) a full demo
dataset. All accounts share the password **`Password123!`**.

| Role                 | Email                                                                                                                                                    |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Super Admin          | `admin@healthcard.dev`                                                                                                                                   |
| Doctor (Cardiology)  | `sarah.chen@healthcard.dev`                                                                                                                              |
| Doctor (Pediatrics)  | `james.okafor@healthcard.dev`                                                                                                                            |
| Doctor (Dermatology) | `maria.lopez@healthcard.dev`                                                                                                                             |
| Patient              | `john.smith@healthcard.dev`, `emily.davis@healthcard.dev`, `michael.brown@healthcard.dev`, `linda.wilson@healthcard.dev`, `robert.taylor@healthcard.dev` |

Seeded records: 3 doctors (each with specializations + weekday availability),
5 patients (each with an active HealthCard + QR), 4 departments, appointments
spanning every status (pending/confirmed/completed/cancelled), prescriptions,
medical history entries, payments spanning succeeded/pending/failed/refunded/
insurance, and both transactional and broadcast-style notifications.

**Known demo limitation:** Medical Reports (file uploads) are not seeded —
they require a real file uploaded through the R2 presigned-URL flow. To
demo this feature, upload a real file live through the patient or doctor
Medical Reports UI rather than expecting seeded rows.

## Scripts

| Script                  | Purpose                              |
| ----------------------- | ------------------------------------ |
| `npm run dev`           | Start the Next.js dev server         |
| `npm run build`         | `prisma generate` + production build |
| `npm run start`         | Start the production server          |
| `npm run lint`          | ESLint                               |
| `npm run typecheck`     | `tsc --noEmit`                       |
| `npm run test`          | Run the Vitest suite once            |
| `npm run test:watch`    | Vitest in watch mode                 |
| `npm run test:coverage` | Vitest with a coverage report        |
| `npm run format`        | Prettier — write                     |
| `npm run format:check`  | Prettier — check only                |
| `npm run db:generate`   | Regenerate the Prisma client         |
| `npm run db:migrate`    | Create + apply a dev migration       |
| `npm run db:deploy`     | Apply migrations in production       |
| `npm run db:studio`     | Open Prisma Studio                   |
| `npm run db:seed`       | Seed demo accounts/data (idempotent) |

A Husky pre-commit hook runs `lint-staged` (ESLint + Prettier on staged files).

## Continuous Integration

Every push and pull request against `main` runs `.github/workflows/ci.yml`:
`typecheck` → `lint` → `test` → `build`, using the same npm scripts as local
development so a green CI run means the exact same checks you'd run
yourself all passed.

## Docker

```bash
docker compose up --build
```

Runs the app in a container on port 3000, reading configuration from `.env`.
All backing services (Postgres, Redis, storage, email, payments) are managed
cloud services (Neon, Upstash, R2, Gmail, Stripe) — no local service
containers are needed. The image healthchecks against `/api/health`.

## Security notes

- Never commit `.env`. Only `.env.example` (placeholders) is tracked.
- Stripe keys are **test mode only** — never place live keys in this project.
- `BETTER_AUTH_SECRET` must be a strong random value in every environment.
- Cached values in Redis are plaintext JSON, trusted via Upstash's
  bearer-token REST auth — treat `UPSTASH_REDIS_REST_TOKEN` like a database
  credential.
- File uploads go through short-lived R2 presigned URLs; downloads are
  ownership-verified before a signed URL is issued.
