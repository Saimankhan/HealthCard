# HealthCard

A digital healthcare management platform — patient/doctor/admin portals,
appointment booking, prescriptions, medical records, a QR-verified digital
HealthCard, and Stripe-backed payments.

> **Status:** Production-hardened. Full feature set (auth, patients, doctors,
> admin, appointments, prescriptions, medical history/reports, Digital
> HealthCard + QR verification, payments, notifications, analytics/reports,
> report export) is complete, tested, and CI-gated.

## Tech stack

| Layer      | Choice                                       |
| ---------- | -------------------------------------------- |
| Framework  | Next.js 15 (App Router) + TypeScript         |
| UI         | Tailwind CSS v4 + shadcn/ui                  |
| Backend    | Next.js Route Handlers + Server Actions      |
| Database   | PostgreSQL (Neon)                            |
| ORM        | Prisma 7 (Neon serverless driver adapter)    |
| Auth       | Better Auth (email/password, sessions, RBAC) |
| Cache      | Upstash Redis (REST)                         |
| Storage    | Cloudflare R2 (S3-compatible)                |
| Email      | Gmail SMTP via Nodemailer                    |
| Payments   | Stripe (test mode only)                      |
| Deployment | Vercel                                       |
| Container  | Docker / docker-compose                      |

## Architecture

Clean Architecture, feature-based modules:

```
src/
  app/                     UI layer — Next.js App Router routes, layouts, pages
  components/ui/           shadcn/ui primitives
  core/                    cross-cutting infrastructure singletons
    auth/                  Better Auth server/client instances, RBAC helpers
    cache/                 Upstash Redis client + cache-aside helper
    config/                zod-validated server/client env
    db/                    Prisma client singleton (Neon adapter)
    email/                 Nodemailer transport + templates
    payments/               Stripe server/client instances
    storage/                Cloudflare R2 client + signed URL helpers
  features/<feature>/      one module per business feature
    routes/                 route-handler logic (thin controllers)
    services/               application layer — use cases
    repository/             infrastructure layer — Prisma-backed data access
    validation/              zod schemas
    types/                   domain types/entities/DTOs
    prisma/                  feature-scoped Prisma type re-exports
    tests/                   unit/integration tests
  lib/                      generic helpers (e.g. `cn`)
  middleware.ts             route-protection gate (session cookie check)

prisma/
  schema/                  multi-file Prisma schema (Prisma 7 schema folder)
  migrations/              generated SQL migrations
```

Features: `auth`, `users`, `patients`, `doctors`, `admin`, `appointments`,
`prescriptions`, `medical-history`, `medical-reports`, `healthcard` (with QR
generation + public verification), `payments` (Stripe), `notifications`
(email/SMS + in-app), `departments`, `reports` (analytics + CSV/PDF/Excel
export), `audit-logs`.

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy `.env.example` to `.env` and fill in real values (Neon, Upstash, R2,
Gmail, Stripe). Generate a Better Auth secret with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 3. Apply database migrations

```bash
npm run db:migrate
```

### 4. Run the dev server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000).

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
containers are needed.

## Security notes

- Never commit `.env`. Only `.env.example` (placeholders) is tracked.
- Stripe keys are **test mode only** — never place live keys in this project.
- `BETTER_AUTH_SECRET` must be a strong random value in every environment.
