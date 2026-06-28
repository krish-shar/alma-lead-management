# Design Document — Lead Management System

> A public lead-intake form with transactional email, plus an auth-gated internal
> dashboard for attorneys to review leads and advance them through a simple state machine.

**Author:** Krish Sharma · **Date:** 2026-06-28
**Stack:** FastAPI · Next.js · PostgreSQL · Better Auth · S3-compatible storage · Resend/SMTP

---

## 1. Problem & Requirements

### 1.1 Functional requirements
- A **publicly accessible lead form** for prospects with required fields: `first name`,
  `last name`, `email`, `resume / CV` (file upload).
- On submission, the system **emails both** (a) the prospect (confirmation) and
  (b) a company **attorney** (new-lead notification).
- An **internal UI behind authentication** that lists all leads with every field the
  prospect supplied (including the resume).
- Each lead has a **state**: it begins `PENDING` and transitions to `REACHED_OUT` when an
  attorney manually marks it after reaching out.

### 1.2 Technical requirements
- Produce a **system design** (this document).
- Build the web app + APIs **end-to-end**.
- **APIs in FastAPI**, **web app in Next.js**.
- **Persistent storage** + integration with an **email service**.
- **Production-grade repository structure.**

### 1.3 Interpretation of ambiguous points
These are explicit decisions, not assumptions left implicit:

| Ambiguity | Decision | Rationale |
|---|---|---|
| What does "update a lead" mean? | The **one-way state transition** `PENDING → REACHED_OUT`, exposed as a real `PATCH /api/leads/{id}`. | The spec only requires the state change. We build a production-shaped `PATCH` endpoint (validated, idempotent-aware) without gold-plating a full CRUD editor nobody asked for (YAGNI). |
| Who is "an attorney inside the company"? | A single **configured attorney email** (`ATTORNEY_EMAIL` env var) receives every new-lead notification. | The spec needs *a* notification target, not per-lead attorney routing. Kept configurable, not hardcoded. |
| What is the resume field? | A **file upload** (PDF / DOC / DOCX, size-capped), stored in object storage, downloadable from the dashboard via a pre-signed URL. | Matches "resume / CV" and real hiring/intake flows; object storage keeps large blobs out of the DB. |
| Can a lead move backward (`REACHED_OUT → PENDING`)? | **No.** The transition is one-way; an illegal transition returns `409 Conflict`. | The described workflow is monotonic. Enforcing it in the service layer prevents data corruption. |

---

## 2. Architecture Overview

```
   PUBLIC (no auth)                     INTERNAL (Better Auth gated)
   ┌──────────────┐                     ┌──────────────────────────────┐
   │ /apply       │                     │ /login → /dashboard          │
   │ lead form    │                     │ leads table · "Mark Reached  │
   │              │                     │ Out" · resume download       │
   └──────┬───────┘                     └──────────────┬───────────────┘
          │ multipart POST                             │ Bearer <JWT>
          ▼                                            ▼
   ┌──────────────────────────  Next.js  (Vercel)  ─────────────────────────┐
   │  • Public form page (client validation + submit to API)                │
   │  • Better Auth: email+password, session, JWT plugin, JWKS endpoint      │
   │  • Protected dashboard (middleware + server session check)              │
   └────────────────────────────────────┬───────────────────────────────────┘
                                         │  Authorization: Bearer <JWT>
                                         ▼
   ┌───────────────────────────  FastAPI  (Render)  ────────────────────────┐
   │  api/ (routers) → services/ → repositories/                            │
   │  • core/security: verify JWT against Better Auth JWKS (cached)          │
   │  • LeadService: create · list · get · transition                       │
   │  • EmailClient: SMTP→Mailpit | Resend  (sent via BackgroundTasks)       │
   │  • StorageClient: S3 API → MinIO | Supabase/R2  (pre-signed URLs)       │
   └─────────┬──────────────────────┬───────────────────────┬───────────────┘
             ▼                       ▼                       ▼
        PostgreSQL              Object storage           Email service
   (leads [Alembic] +          (resume files)        (prospect + attorney)
    auth tables [Better Auth])
```

**Two services, one database.** The Next.js app owns presentation + authentication;
the FastAPI app owns business logic + persistence. They share one Postgres instance but
own disjoint table sets (FastAPI/Alembic manages `leads`; Better Auth manages its own
`user`/`session`/`account`/`jwks` tables). They communicate over HTTP with a verifiable JWT.

### 2.1 The unifying principle: portable protocols
Every external dependency is reached through a **standard, swappable protocol** so the
exact same code runs locally and in the cloud — only environment variables differ:

| Concern | Protocol | Local impl | Hosted (free) impl |
|---|---|---|---|
| Database | Postgres wire | Docker `postgres` | Supabase Postgres |
| Object storage | **S3 API** (boto3) | Docker MinIO | Supabase Storage (S3 endpoint) |
| Email | **SMTP** / Resend HTTP | Docker Mailpit | Resend |
| Auth keys | **JWKS** (JSON Web Key Set) | Better Auth dev server | Better Auth on Vercel |

This is why "deploy for free later" is a configuration task, not a refactor.

---

## 3. Technology Choices & Rationale

| Choice | Why | Alternatives considered |
|---|---|---|
| **FastAPI** | Required. Async, first-class Pydantic validation, OpenAPI docs for free, clean dependency-injection for auth. | (mandated) |
| **Next.js (App Router)** | Required. Server components for auth-gated pages, middleware for route protection, native Vercel deploy. | (mandated) |
| **PostgreSQL** | Production-representative relational store; strong consistency for the state machine; free serverless tiers (Supabase/Neon). | SQLite (not production-shaped), MySQL (no advantage here). |
| **SQLAlchemy 2.0 + Alembic** | Typed ORM + first-class migrations = reproducible schema, the production norm. | Raw SQL (more error-prone), Tortoise/SQLModel (smaller ecosystems). |
| **Better Auth** | Modern, TypeScript-native auth that lives with the frontend; email+password + a **JWT plugin** that lets a separate backend verify identity via JWKS. | NextAuth/Auth.js (heavier session wiring to a non-Node API), hand-rolled JWT (reinventing session/user management). |
| **S3 API via boto3 (MinIO/Supabase)** | Object storage is the right home for resumes; the S3 API is universal, so local MinIO and hosted Supabase Storage are interchangeable. Pre-signed URLs keep the backend out of the file-download path. | DB blobs (bloats DB, bad for large files), local disk (not cloud-portable). |
| **Resend + SMTP (Mailpit)** | Resend = trivial real email on a free tier; Mailpit = a zero-config local inbox for testing with a visible UI (great for the demo). A single `EmailClient` interface swaps between them. | SendGrid/SES (more setup), console-only (nothing to show in the demo). |
| **Docker Compose** | One command (`docker compose up`) brings up Postgres + MinIO + Mailpit + both apps — the cleanest "run locally" story. | Manual per-service startup (more steps, more "works on my machine"). |

---

## 4. Data Model

### 4.1 `leads` (managed by Alembic)
| Column | Type | Notes |
|---|---|---|
| `id` | `UUID` (PK) | server-generated |
| `first_name` | `text` | required, trimmed, non-empty |
| `last_name` | `text` | required, trimmed, non-empty |
| `email` | `text` | required, validated (Pydantic `EmailStr`) |
| `resume_key` | `text` | S3 object key, e.g. `resumes/{id}/{filename}` |
| `resume_filename` | `text` | original filename (for download) |
| `resume_content_type` | `text` | e.g. `application/pdf` |
| `state` | `enum('PENDING','REACHED_OUT')` | default `PENDING` |
| `created_at` | `timestamptz` | default now |
| `updated_at` | `timestamptz` | auto-updated |
| `reached_out_at` | `timestamptz` | nullable; set on transition |

Indexes: PK on `id`; index on `state` and `created_at` for dashboard sorting/filtering.

### 4.2 Auth tables (managed by Better Auth's CLI)
`user`, `session`, `account`, `verification`, `jwks` — created by Better Auth's migration
command in the same database. We **do not** hand-edit these; the separation of ownership
(Alembic vs Better Auth) is intentional and documented in `RUNNING.md`.

---

## 5. API Design (FastAPI)

| Method | Path | Auth | Body / Params | Success | Errors |
|---|---|---|---|---|---|
| `POST` | `/api/leads` | public | `multipart`: `first_name`, `last_name`, `email`, `resume` (file) | `201` + lead | `422` validation; `413` file too large; `415` bad type |
| `GET` | `/api/leads` | ✅ JWT | `?state=&limit=&offset=` | `200` + `{items,total}` | `401` |
| `GET` | `/api/leads/{id}` | ✅ JWT | — | `200` + lead | `401`, `404` |
| `GET` | `/api/leads/{id}/resume` | ✅ JWT | — | `200` + `{url}` (pre-signed) | `401`, `404` |
| `PATCH` | `/api/leads/{id}` | ✅ JWT | `{ "state": "REACHED_OUT" }` | `200` + lead | `401`, `404`, `409` illegal transition |
| `GET` | `/api/health` | public | — | `200` `{status,db,storage}` | — |

- **Layering:** routers do HTTP concerns only; `LeadService` holds business rules
  (validation, state-transition guard, email orchestration); `LeadRepository` does data
  access. This keeps each unit independently testable.
- **Validation:** Pydantic schemas validate inputs; resume type/size checked before upload.
- **OpenAPI:** auto-generated at `/docs` — a reviewer can exercise the whole API there.

### 5.1 Lead submission flow (`POST /api/leads`)
1. Validate fields + resume (type/size).
2. Upload resume to object storage (`resumes/{lead_id}/{filename}`).
3. Persist the lead row as `PENDING` (**source of truth committed first**).
4. Enqueue two emails via `BackgroundTasks` (prospect confirmation + attorney notification).
5. Return `201` immediately — the prospect never waits on email I/O.

**Reliability stance:** email is best-effort and **non-blocking**. The lead is saved even
if email later fails; failures are logged. A high-volume production system would replace
`BackgroundTasks` with a durable queue (Celery/RQ/SQS) and retry with backoff — called out
as a deliberate, scoped trade-off rather than an oversight.

---

## 6. Authentication Design

**Better Auth (Next.js) issues identity; FastAPI verifies it.**

```
1. Attorney logs in at /login  → Better Auth validates email+password,
   creates a session, and (JWT plugin) can mint a signed JWT.
2. Better Auth exposes a JWKS endpoint: GET /api/auth/jwks (public keys).
3. The dashboard attaches Authorization: Bearer <JWT> to FastAPI calls.
4. FastAPI (core/security.py) fetches + caches the JWKS, verifies the JWT's
   signature, issuer, audience, and expiry, and resolves the attorney identity.
   Protected routes depend on this via FastAPI's Depends().
```

Why JWKS over a shared secret: the **API is independently secured and directly callable**
(demonstrable via `/docs` or curl in the Loom), keys can rotate without redeploying the
backend, and no symmetric secret is shared between two services. This is the standard
OAuth-style asymmetric bearer pattern.

- **Seeding:** a script seeds one attorney account (`attorney@alma.test`) so the dashboard
  is usable immediately; public signup is disabled (internal tool).
- **Token lifetime:** short-lived JWTs; the browser refreshes via the Better Auth session.

---

## 7. Email Design

A single interface, two backends, selected by env:

```
EmailClient (protocol)
 ├─ SMTPEmailClient   → Mailpit (local, visible inbox at :8025) — no API keys
 └─ ResendEmailClient → Resend HTTP API (hosted real delivery)

EMAIL_PROVIDER=smtp|resend   # chooses the implementation at startup
```

- **Two templates:** prospect confirmation ("we received your application") and attorney
  notification ("new lead: {name}, {email}, resume attached/linked").
- **Testability:** a `FakeEmailClient` captures sent messages in tests — no network, fast,
  asserts on recipients/subjects/bodies.
- **Local demo:** Mailpit's web UI shows both emails arriving on submit — ideal for the Loom.

---

## 8. Storage Design

```
StorageClient (protocol)
 └─ S3StorageClient (boto3)  → MinIO (local) | Supabase Storage (hosted)

S3_ENDPOINT_URL, S3_BUCKET, S3_ACCESS_KEY, S3_SECRET_KEY, S3_REGION
```

- Resumes are uploaded under `resumes/{lead_id}/{filename}`.
- Downloads use **pre-signed URLs** (time-limited) so the backend never proxies file bytes
  and files are never public.
- File constraints enforced before upload: allowed types `pdf/doc/docx`, max size (e.g. 5 MB).

---

## 9. State Machine

```
        ┌─────────┐   attorney PATCH {state: REACHED_OUT}   ┌──────────────┐
        │ PENDING │ ──────────────────────────────────────▶ │ REACHED_OUT  │
        └─────────┘                                          └──────────────┘
            ▲  │  illegal/back-transition → 409                     │
            └──┘  (no transition out of REACHED_OUT)  ◀─────────────┘
```
Transition validity lives in `LeadService.transition()`, not in the router or the DB,
so it is unit-tested in isolation and reused by any future caller.

---

## 10. Frontend Design (Next.js)

| Route | Auth | Purpose |
|---|---|---|
| `/apply` (and `/`) | public | Lead form: validated fields + resume upload; success state on submit. |
| `/login` | public | Attorney email+password login (Better Auth). |
| `/dashboard` | protected | Leads table: name, email, state badge, submitted date; **Mark Reached Out** action; **resume download**; filter by state. |

- **Protection:** Next.js middleware + server-side session check redirect unauthenticated
  users away from `/dashboard`.
- **UX:** optimistic state badge update on "Mark Reached Out" with error rollback; clear
  empty/loading/error states; accessible form labels and validation messages.
- **Styling:** Tailwind, clean and legible — polished but not over-designed.

---

## 11. Local Development & Deployment

### 11.1 Local (one command)
`docker compose up` starts: `postgres`, `minio`, `mailpit`, `backend` (FastAPI),
`frontend` (Next.js). A `make seed` / script creates the storage bucket, runs Alembic +
Better Auth migrations, and seeds the attorney. Full steps in `RUNNING.md`.

### 11.2 Free hosting target
| Component | Host | Free-tier note |
|---|---|---|
| Frontend (Next.js) | **Vercel** | Native Next.js deploy |
| Backend (FastAPI) | **Render** | Free web service |
| Database | **Supabase Postgres** | No credit card on free tier |
| Object storage | **Supabase Storage** | S3-compatible endpoint, same boto3 code |
| Email | **Resend** | Free tier, real delivery |

Consolidating DB + storage on Supabase minimizes accounts and avoids a credit card.
Deployment specifics live in `DEPLOYMENT.md`.

---

## 12. Testing Strategy

- **Backend (pytest):**
  - *Unit:* state-transition guard, file-type/size validation, email template rendering,
    `EmailClient`/`StorageClient` via fakes.
  - *Integration:* API endpoints through an ASGI transport against a test Postgres
    (transactional rollback per test), incl. auth-protected routes with a forged-but-valid
    test JWT (test JWKS), and the full submit → store → email path with fakes.
- **Frontend:** component tests for the form (validation) + at least one **Playwright E2E**
  covering submit → email landed (Mailpit) → login → see lead → mark reached out.
- **CI-ready:** tests runnable via `make test`; deterministic, no external network needed.

---

## 13. Security Considerations
- Resumes are private; access only via short-lived pre-signed URLs behind auth.
- JWTs verified asymmetrically (JWKS); issuer/audience/expiry checked; clock-skew tolerance.
- Input validation on every public field; file type + size limits guard the upload path.
- Secrets only via env vars; `.env` git-ignored; `.env.example` documents required keys.
- CORS restricted to the known frontend origin.
- Public signup disabled on the internal tool; attorney accounts are seeded/provisioned.

---

## 14. Trade-offs & "with more time"
- **Email via BackgroundTasks**, not a durable queue — fine for this volume; a queue
  (Celery/SQS) with retries/backoff is the production upgrade.
- **Single attorney recipient** — a real system routes by practice area / round-robin.
- **One-way state machine** — real CRMs have richer pipelines; kept minimal per the spec.
- **No rate limiting on the public form** — production needs throttling + spam/captcha.
- **Resume virus scanning** omitted — a real intake flow would scan uploads.

---

## 15. Coding-Agent Usage (rubric)
This project is built primarily with the **Claude Code** agent (model: Claude Opus 4.8),
directed and reviewed by the author. Attribution is continuous:
- Commits carry `Co-Authored-By` trailers for agent-generated work.
- `docs/agent-usage/NOTES.md` marks agent-generated vs hand-tuned files.
- `docs/agent-usage/prompt-logs/` holds representative prompts/transcript excerpts.
- `docs/agent-usage/WRITEUP.md` (≤ ½ page) covers tools used, delegate-vs-write split, and
  **a real instance where the agent produced subtly wrong code — caught and fixed** (captured
  authentically during the review passes, not invented).
```
