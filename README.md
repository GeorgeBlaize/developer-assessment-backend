# Developer Assessment & Coding Platform — Backend

A RESTful API for recruitment skills evaluation: companies create coding/MCQ/written assessments, invite candidates, candidates take timed attempts, submissions are auto- or manually graded, and companies get pass-rate analytics.

Built for the B7A6 Level 2 Assignment 6 backend brief (Assignment #4: Developer Assessment Platform).

## Live links

| | |
|---|---|
| **Live API** | https://developer-assessment-backend.vercel.app |
| **API Documentation (Postman)** | https://documenter.getpostman.com/view/55118777/2sBYAxP9DY |
| **Postman collection (import into Postman)** | [`postman/collection.postman_collection.json`](./postman/collection.postman_collection.json) + [`postman/environment.postman_environment.json`](./postman/environment.postman_environment.json) |

## Tech stack

- **Runtime**: Node.js, TypeScript, Express.js
- **Database**: PostgreSQL + Prisma ORM
- **Auth**: JWT (access + rotating refresh tokens) + Google OAuth (ID-token verification)
- **Validation**: Zod
- **Payments**: SSLCommerz (sandbox), company subscription plans
- **Security**: helmet, CORS, express-rate-limit, bcrypt password hashing
- **Deployment**: Vercel serverless (Express app wrapped in `api/server.ts`)

## Architecture

```
Routes (src/modules/*/*.routes.ts)
  -> Controllers (*.controller.ts)      thin: parse req, call service, sendResponse
    -> Services (*.service.ts)          business logic, Prisma queries/transactions
      -> Prisma Client (src/db/prisma.ts)
```

Cross-cutting: `src/middlewares` (JWT auth + RBAC, Zod validation, rate limiting, error handling), `src/errors` (AppError, Zod/Prisma error formatters), `src/utils` (pagination, JWT signing, SSLCommerz client, audit logging).

## Roles (exactly 3)

| Role      | Can do |
|-----------|--------|
| **ADMIN** | Manage users (activate/deactivate/delete), manage subscription plans, view platform-wide stats and the full audit log. |
| **COMPANY** | Create/publish assessments with CODING/MCQ/WRITTEN problems, invite registered candidates, grade WRITTEN/CODING submissions, view per-assessment analytics, subscribe to a paid plan via SSLCommerz. |
| **CANDIDATE** | Accept/decline invitations, start a timed attempt, submit answers (MCQ auto-graded instantly), view their own results. |

## Consistent API response shape

```json
// success
{ "success": true, "message": "Operation successful", "data": {}, "meta": { "page": 1, "limit": 10, "total": 42, "totalPages": 5 } }
// error
{ "success": false, "message": "Something went wrong", "errors": [{ "path": "email", "message": "Invalid email address" }] }
```

All endpoints live under `/api/v1`.

## Endpoint map (60+ endpoints)

- **Auth**: register, login, Google login, refresh-token, logout, change-password
- **Users**: get/update own profile; admin: list (paginated/filtered/searched), activate/deactivate, soft-delete
- **Plans**: public list; admin: create/update
- **Payments**: subscribe (SSLCommerz checkout session), list own payment history, success/fail/cancel/IPN callbacks
- **Assessments**: create, list own (paginated/filtered/searched), get, update (draft only), publish, archive, soft-delete, analytics
- **Problems** (nested under an assessment): create (CODING/MCQ/WRITTEN), list, update, delete
- **Invitations**: invite candidates by email, list per-assessment, list own (candidate), accept/decline
- **Attempts**: start (from an accepted invitation), get, submit an answer, finish, list own
- **Submissions**: list per-assessment (company), manually grade WRITTEN/CODING
- **Company dashboard**: plan/subscription status + counts
- **Admin**: audit logs (paginated/filtered), platform stats

Full request/response examples: see the hosted [Postman documentation](https://documenter.getpostman.com/view/55118777/2sBYAxP9DY), or import `postman/collection.postman_collection.json` + `postman/environment.postman_environment.json` into Postman yourself.

## Key business rules

- A company's active **plan** caps `maxActiveAssessments` (checked on publish) and `maxInvitesPerAssessment` (checked on invite) — enforced server-side, not just UI-side.
- Problems can only be added/edited while an assessment is `DRAFT`; publishing snapshots `totalMarks` from problem weights.
- An `Attempt` is time-boxed (`expiresAt`); every read/write against it re-checks the deadline server-side and auto-expires + finalizes the score if the timer lapsed, even if the candidate never called "finish".
- MCQ submissions are graded instantly (no external code execution — this backend does not run untrusted code). CODING and WRITTEN submissions are stored `PENDING` and require a company to manually grade them.
- An attempt flips from `SUBMITTED` to `EVALUATED` automatically the moment every one of its submissions has a non-`PENDING` grade.
- Soft deletes (`deletedAt`) everywhere; nothing is hard-deleted except cascade cleanup of dependent rows via foreign keys.
- Every state-changing action of consequence (login, publish, invite, grade, payment, user status change) writes an `AuditLog` row.

## Getting started

See [SETUP.md](./SETUP.md) for step-by-step instructions to provision PostgreSQL (Neon), Google OAuth credentials, and an SSLCommerz sandbox account, plus how to run locally and deploy to Vercel.

```bash
npm install
npm run prisma:migrate
npm run seed
npm run dev
```

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Start the API with hot reload |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run the compiled build |
| `npm run prisma:migrate` | Apply migrations (dev) |
| `npm run prisma:deploy` | Apply migrations (production) |
| `npm run seed` | Seed demo admin/company/candidate + sample assessment |
| `npm run lint` / `npm run format` | ESLint / Prettier |
