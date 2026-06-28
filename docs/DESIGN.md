# Design Document — Lead Management System

> A public lead-intake form with transactional email, plus an auth-gated internal
> dashboard for attorneys to review leads and advance them through a simple state machine.

**Author:** Krish Sharma · **Date:** 2026-06-28
**Stack:** FastAPI · Next.js · PostgreSQL · Better Auth · S3-compatible storage · Resend/SMTP

> **Revision note (v2):** This design was stress-tested by an adversarial planning pass
> (independent "Planner" + "Devil's Advocate" review) before implementation. v2 incorporates
> their findings: cloud hosting is demoted to a **stretch goal** (local Docker Compose +
> Loom is the canonical, graded deliverable); the Better Auth↔FastAPI JWKS path is pinned to
> verified specifics; and two container-vs-browser URL footguns (JWKS fetch URL, S3 presigned
> host) plus the Resend free-tier email constraint are designed around explicitly. See §17 for
> the review log.

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
| What does "update a lead" mean? | The **one-way state transition** `PENDING → REACHED_OUT`, exposed as a real `PATCH /api/leads/{id}`. Re-marking an already-`REACHED_OUT` lead is an **idempotent `200` no-op** (handles double-clicks / two attorneys); the illegal `REACHED_OUT → PENDING` returns `409`. | The spec only requires the state change. We build a production-shaped `PATCH` without gold-plating a full CRUD editor (YAGNI), and make repeat calls safe. |
| Who is "an attorney inside the company"? | A single **configured attorney email** (`ATTORNEY_EMAIL` env var) receives every new-lead notification. | The spec needs *a* notification target, not per-lead routing. Configurable, not hardcoded. |
| What is the resume field? | A **file upload** (PDF / DOC / DOCX, **≤ 4 MB**), stored in object storage, downloadable from the dashboard via a short-lived pre-signed URL minted on demand. | Matches "resume / CV"; object storage keeps blobs out of the DB. 4 MB stays under any serverless body limit (see §5.2). |
| Can a lead move backward? | **No.** One-way; illegal transitions → `409`. | The workflow is monotonic; enforced in the service layer. |
| Duplicate submissions (same email twice)? | **Allowed** — each submission is a distinct lead. No uniqueness constraint on `email`. | A prospect may legitimately re-apply; deduping is a product decision out of scope here. Called out so it is a conscious choice. |
| Is a live hosted URL required? | **No.** The brief requires a repo, run-doc, design-doc, agent-usage doc, and a **Loom of the E2E workflow** — not a deployed URL. **Local Docker Compose E2E + Loom is canonical; cloud deploy is a stretch goal** (§11). | Removes the most failure-prone work (4-platform deploy, cold starts, free-tier email limits) from the critical path. |

---

## 2. Architecture Overview

```
   PUBLIC (no auth)                     INTERNAL (Better Auth gated)
   ┌──────────────┐                     ┌──────────────────────────────┐
   │ /apply       │                     │ /login → /dashboard          │
   │ lead form    │                     │ leads table · "Mark Reached  │
   │              │                     │ Out" · resume download       │
   └──────┬───────┘                     └───────┬──────────────┬───────┘
          │ multipart POST                      │ login/session │ Bearer <JWT>
          │ (browser → FastAPI, CORS)           ▼              │ (browser → FastAPI)
          │                          ┌──────────────────────┐  │
          │                          │  Next.js (Vercel)     │  │
          │                          │  • public form page   │  │
          │                          │  • Better Auth:       │  │
          │                          │    email+password,    │  │
          │                          │    JWT plugin, JWKS    │  │
          │                          │  • protected dashboard │  │
          │                          └───────────┬───────────┘  │
          │                              JWKS     │ (fetched by   │
          │                              endpoint │  FastAPI)     │
          ▼                                       ▼               ▼
   ┌───────────────────────────  FastAPI  (Render)  ────────────────────────┐
   │  api/ (routers) → services/ → repositories/                            │
   │  • core/security: verify JWT against Better Auth JWKS (cached)          │
   │  • LeadService: create · list · get · transition                       │
   │  • EmailClient: SMTP→Mailpit | Resend  (sent via BackgroundTasks)       │
   │  • StorageClient: S3 API → MinIO | Supabase  (presigned URLs)           │
   └─────────┬──────────────────────┬───────────────────────┬───────────────┘
             ▼                       ▼                       ▼
        PostgreSQL              Object storage           Email service
   (leads [Alembic] +          (resume files)        (prospect + attorney)
    auth tables [Better Auth])
```

**Both the public form POST and the dashboard's authenticated GET/PATCH go browser →
FastAPI directly** (CORS-allowed), *not* proxied through Next.js. This keeps the API
independently exercisable and avoids Vercel's ~4.5 MB serverless body limit on uploads.
Next.js owns presentation + authentication (Better Auth); FastAPI owns business logic +
persistence. They share one Postgres but own disjoint table sets.

### 2.1 The unifying principle: portable protocols
Every external dependency is reached through a **standard, swappable protocol** so the same
code runs locally and (as a stretch) in the cloud — only environment variables differ:

| Concern | Protocol | Local impl (canonical) | Hosted (stretch) impl |
|---|---|---|---|
| Database | Postgres wire | Docker `postgres` | Supabase Postgres |
| Object storage | **S3 API** (boto3) | Docker MinIO | Supabase Storage (S3 endpoint) |
| Email | **SMTP** / Resend HTTP | Docker **Mailpit** | Resend (verified domain) |
| Auth keys | **JWKS** | Better Auth in Compose | Better Auth on Vercel |

---

## 3. Technology Choices & Rationale

| Choice | Why | Alternatives considered |
|---|---|---|
| **FastAPI** | Required. Async, Pydantic validation, free OpenAPI docs, clean DI for auth. | (mandated) |
| **Next.js (App Router)** | Required. Middleware route protection, native Vercel deploy. | (mandated) |
| **PostgreSQL** | Production-representative; strong consistency for the state machine; free tiers. | SQLite (not production-shaped). |
| **SQLAlchemy 2.0 + Alembic** | Typed ORM + first-class migrations = reproducible schema. | Raw SQL (error-prone). |
| **Better Auth** | Modern TS-native auth with an **email+password** flow and a **JWT plugin** exposing **JWKS**, so a separate Python backend can verify identity asymmetrically. | NextAuth (heavier wiring to a non-Node API), hand-rolled JWT (reinvents user/session mgmt). |
| **S3 API via boto3 (MinIO/Supabase)** | Right home for resumes; universal S3 protocol → local MinIO and hosted Supabase interchangeable; presigned URLs keep file bytes out of the backend. | DB blobs, local disk (not portable). |
| **Resend + SMTP (Mailpit)** | Mailpit = zero-config local inbox that emails **any** address (perfect for the canonical "both emails" demo); Resend = real hosted delivery via a verified domain. One `EmailClient` interface swaps them. | SendGrid/SES (more setup), console-only (nothing to show). |
| **Docker Compose** | One command brings up Postgres + MinIO + Mailpit + both apps — the canonical "run locally" + Loom story. | Manual per-service startup. |

---

## 4. Data Model

### 4.1 `leads` (managed by Alembic)
| Column | Type | Notes |
|---|---|---|
| `id` | `UUID` (PK) | server-generated |
| `first_name` | `text` | required, trimmed, non-empty |
| `last_name` | `text` | required, trimmed, non-empty |
| `email` | `text` | required, validated (Pydantic `EmailStr`) |
| `resume_key` | `text` | S3 object key: `resumes/{id}/{sanitized_filename}` |
| `resume_filename` | `text` | **original** filename, preserved for `Content-Disposition` on download |
| `resume_content_type` | `text` | e.g. `application/pdf` |
| `state` | `enum('PENDING','REACHED_OUT')` | default `PENDING` |
| `created_at` | `timestamptz` | default now |
| `updated_at` | `timestamptz` | auto-updated |
| `reached_out_at` | `timestamptz` | nullable; set on transition |

Indexes: PK on `id`; index on `state` and `created_at` for dashboard sorting/filtering.

### 4.2 Auth tables (managed by Better Auth's CLI)
`user`, `session`, `account`, `verification`, `jwks` — created by Better Auth's migration
command in the same database.
- **Alembic must not touch them.** `alembic revision --autogenerate` compares models to the
  live DB and would emit `drop_table` for any table it doesn't own. We add an
  **`include_object` / `include_name` filter** in `alembic/env.py` scoping autogenerate to the
  `leads` table only. (The two systems otherwise coexist cleanly — disjoint tables, no
  cross-FKs, same `DATABASE_URL`; the filter just protects the autogenerate workflow.)
- **Seeding the attorney:** Better Auth hashes passwords with **scrypt** (its own scheme), so
  the seed **cannot** raw-`INSERT` a user row. The seed script calls Better Auth's
  **sign-up / admin API** to create `attorney@alma.test`, then public signup is disabled.

---

## 5. API Design (FastAPI)

| Method | Path | Auth | Body / Params | Success | Errors |
|---|---|---|---|---|---|
| `POST` | `/api/leads` | public | `multipart`: `first_name`, `last_name`, `email`, `resume` (file) | `201` + lead | `422` validation; `413` too large; `415` bad type |
| `GET` | `/api/leads` | ✅ JWT | `?state=&limit=&offset=` | `200` + `{items,total}` | `401` |
| `GET` | `/api/leads/{id}` | ✅ JWT | — | `200` + lead | `401`, `404` |
| `GET` | `/api/leads/{id}/resume` | ✅ JWT | — | `200` + `{url}` (fresh presigned) | `401`, `404` |
| `PATCH` | `/api/leads/{id}` | ✅ JWT | `{ "state": "REACHED_OUT" }` | `200` + lead | `401`, `404`, `409` illegal |
| `GET` | `/api/health` | public | — | `200` `{status,db,storage}` | — |

- **Layering:** routers do HTTP only; `LeadService` holds business rules (validation, the
  transition guard, email orchestration); `LeadRepository` does data access. Independently testable.
- **`PATCH` semantics:** target state `REACHED_OUT` from `PENDING` → transition + set
  `reached_out_at`; from `REACHED_OUT` → idempotent `200` no-op; `REACHED_OUT → PENDING` → `409`.
- **OpenAPI** at `/docs` — the whole API is exercisable there.

### 5.1 Lead submission flow (`POST /api/leads`)
1. Validate fields + resume (type/size). **Sanitize the filename** (strip paths/control chars,
   bound length) before using it in the object key; keep the original for download metadata.
2. Upload resume to object storage (`resumes/{lead_id}/{sanitized}`).
3. Persist the lead row as `PENDING` (**source of truth committed first**).
   - **Orphan safety:** if the DB commit fails after upload, best-effort delete the uploaded
     object (compensating cleanup); any residual orphan is logged. Documented trade-off, not silent.
4. Enqueue two emails via `BackgroundTasks` (prospect confirmation + attorney notification).
5. Return `201` immediately — the prospect never waits on email I/O.

**Reliability stance:** email is best-effort and **non-blocking**; the lead is saved even if
email later fails (failures logged). A high-volume system swaps `BackgroundTasks` for a durable
queue (Celery/RQ/SQS) with retry/backoff — a deliberate, scoped trade-off.

### 5.2 Upload routing & limits
The public form posts multipart **directly to FastAPI** (CORS-allowed origin). This avoids
proxying large bodies through a Next.js route handler on Vercel (~4.5 MB serverless cap); the
**4 MB resume limit** stays safely under any such ceiling and is enforced server-side.

---

## 6. Authentication Design

**Better Auth (Next.js) issues identity; FastAPI verifies it asymmetrically via JWKS.**
All specifics below are verified against current Better Auth + PyJWT docs.

### 6.1 Token mechanics (pinned)
- **Algorithm: EdDSA (Ed25519)** — Better Auth's default. **Do not switch** to RS256/ES256
  (known JWKS-generation bugs on non-default algorithms).
- **JWKS endpoint:** `GET /api/auth/jwks`. JWT header carries `kid` for key selection.
- **Claims:** `iss` and `aud` both default to **`BETTER_AUTH_URL`** (the *browser-facing*
  Next.js origin); `exp` = **15 minutes**; `sub` = user id.
- **FastAPI verification:** **PyJWT + `cryptography`** (required for EdDSA). `PyJWKClient`
  fetches/caches the JWKS; `jwt.decode(token, key, algorithms=["EdDSA"], issuer=..., audience=...)`
  checks signature + `iss` + `aud` + `exp` in one call. Protected routes depend on this via `Depends()`.

### 6.2 Two URL contexts (the footgun, designed around)
In Docker, FastAPI fetches JWKS over the **internal** network, but the token's `iss`/`aud`
is the **browser** origin. These are **two distinct config values**, never conflated:
- `JWT_JWKS_URL` — where FastAPI *fetches* keys, e.g. `http://frontend:3000/api/auth/jwks` (Docker) / the Vercel URL (hosted).
- `JWT_ISSUER` / `JWT_AUDIENCE` — what FastAPI *expects in the token*, e.g. `http://localhost:3000` (browser) / the public Vercel URL (hosted).

All three are **injectable config** (not hardcoded) so auth is unit-testable against a local
test JWKS (§12).

### 6.3 Obtaining the bearer token (the other under-specified bit)
The JWT is **not** the session cookie — it is fetched separately while authenticated. The
**dashboard is a client component** that calls **`authClient.token()`** (documented; also
available as `GET /api/auth/token` or the `set-auth-jwt` response header) to get a fresh JWT,
attaches `Authorization: Bearer <jwt>` to FastAPI calls, and **re-fetches on a `401`** (covers
the 15-min expiry). Route access is still gated by Next.js middleware (session check).

### 6.4 Cross-origin
Better Auth `trustedOrigins` includes the frontend origin; FastAPI `CORSMiddleware` allows the
frontend origin **and the `Authorization` header** (the authenticated GET/PATCH are preflighted).
Public signup disabled; attorney provisioned via seed (§4.2).

---

## 7. Email Design

A single interface, two backends, selected by env:

```
EmailClient (protocol)
 ├─ SMTPEmailClient   → Mailpit (local, visible inbox :8025) — emails ANY address, no keys
 └─ ResendEmailClient → Resend HTTP API (hosted real delivery, verified domain)

EMAIL_PROVIDER=smtp|resend
```

- **Two templates:** prospect confirmation; attorney notification. The attorney email **links
  to the auth-gated dashboard lead detail** (which mints a fresh presigned URL on demand) —
  **not** an embedded presigned URL, which would expire into a dead link.
- **Canonical demo = Mailpit:** it delivers to both the prospect's and the attorney's addresses
  regardless of domain, so the Loom visibly shows the core "email both" requirement working.
- **Resend free-tier caveat (hosted):** without a **verified domain**, Resend only sends to the
  account owner's address. The author **has a domain**, so a hosted deploy can verify it and send
  real mail to anyone; until then, Mailpit is the source of truth for the demo.
- **Testability:** a `FakeEmailClient` captures messages in tests (recipients/subject/body), no network.

---

## 8. Storage Design

```
StorageClient (protocol)
 └─ S3StorageClient (boto3)  → MinIO (local) | Supabase Storage (hosted)
```

### 8.1 Two endpoints (the second footgun, designed around)
A presigned URL is cryptographically bound to the host it was signed with, so a backend that
signs with its **internal** endpoint produces a URL the **browser cannot resolve**. We keep
two values:
- `S3_INTERNAL_ENDPOINT` — backend↔storage traffic (e.g. `http://minio:9000` in Docker).
- `S3_PUBLIC_ENDPOINT` — used when **generating presigned URLs** the browser will open
  (e.g. `http://localhost:9000` locally / the Supabase S3 host in prod).

### 8.2 Other specifics
- Keys: `resumes/{lead_id}/{sanitized_filename}`; download via short-lived presigned GET (TTL
  noted in config, e.g. 5 min) minted **on demand** by `GET /api/leads/{id}/resume`.
- File constraints enforced pre-upload: types `pdf/doc/docx`, ≤ 4 MB. (Declared content-type is
  spoofable; magic-byte sniffing + virus scanning are deferred, production-noted, not silently skipped.)
- **Hosted (Supabase) requires** SigV4 (`s3v4`), region matching the endpoint, and
  **virtual-hosted addressing**; MinIO uses **path-style**. Addressing style is config
  (`S3_ADDRESSING_STYLE`).

---

## 9. State Machine

```
        ┌─────────┐   attorney PATCH {state: REACHED_OUT}   ┌──────────────┐
        │ PENDING │ ──────────────────────────────────────▶ │ REACHED_OUT  │
        └─────────┘                                          └──────────────┘
            ▲                                                   │   │
            └────────── REACHED_OUT → PENDING = 409 ────────────┘   │
                        REACHED_OUT → REACHED_OUT = 200 (idempotent no-op)
```
Transition validity lives in `LeadService.transition()` — unit-tested in isolation.

---

## 10. Frontend Design (Next.js)

| Route | Auth | Purpose |
|---|---|---|
| `/apply` (and `/`) | public | Lead form: validated fields + resume upload; posts directly to FastAPI; success state. |
| `/login` | public | Attorney email+password login (Better Auth). |
| `/dashboard` | protected | **Client component**: leads table (name, email, state badge, date), **Mark Reached Out** (PATCH), **resume download**, filter by state. |

- **Protection:** Next.js middleware redirects unauthenticated users from `/dashboard`; the
  client component fetches a JWT via `authClient.token()` for its FastAPI calls (§6.3).
- **UX:** "Mark Reached Out" → PATCH → **refetch** (simple, robust; no optimistic-rollback
  complexity); clear empty/loading/error states; accessible labels + validation messages.
- **Styling:** Tailwind — clean and legible, not over-designed.

---

## 11. Local Development & Deployment

### 11.1 Local (canonical, one command)
`docker compose up` starts: `postgres`, `minio`, `mailpit`, `backend` (FastAPI),
`frontend` (Next.js). A `make seed` target: creates the MinIO bucket, runs **Alembic** +
**Better Auth** migrations, and seeds the attorney **via Better Auth's API**. Full steps in
`RUNNING.md`. **This is the graded deliverable and where the Loom is recorded.**

### 11.2 Free hosting (stretch goal — only after core + docs + Loom are done)
| Component | Host | Note |
|---|---|---|
| Frontend (Next.js) | **Vercel** | native deploy |
| Backend (FastAPI) | **Render** | free web service; **spins down after 15 min idle (~1 min cold start)** — pre-warm before any hosted demo |
| Database | **Supabase Postgres** | no credit card; **free projects pause after ~7 days DB inactivity** |
| Object storage | **Supabase Storage** | S3 endpoint; `s3v4` + region + virtual addressing (§8.2) |
| Email | **Resend** | verify the author's **domain** to enable real delivery to any recipient |

**Hosted migration step (required if deploying):** run Alembic + Better Auth migrations against
Supabase (e.g. Render pre-deploy command) before first use. Detailed in `DEPLOYMENT.md`.
Because every dependency is env-driven (§2.1), deploy is config, not code change.

---

## 12. Testing Strategy

**Minimum required (must pass):**
- **Unit:** state-transition guard (incl. idempotent no-op + 409), file type/size validation,
  email template rendering, `EmailClient`/`StorageClient` via fakes.
- **Integration (one happy path):** `POST /api/leads` through an ASGI transport against a test
  Postgres (transactional rollback per test) with `FakeEmail`/`FakeStorage` → asserts lead
  persisted `PENDING` + both emails captured.
- **Auth (one test):** mint a JWT with a **locally-generated Ed25519 keypair**, serve a **test
  JWKS**, point the verifier's injectable JWKS-URL/issuer/audience at test values, assert a
  protected route returns `200` with a valid token and `401` without. (Requires the §6.2
  injectable config — designed in from the start.)

**Optional (build only if time remains; first to cut):**
- **Playwright E2E** happy-path (submit → email in Mailpit → login → see lead → mark reached
  out). Note: email is sent via `BackgroundTasks`, so the Mailpit assertion must **poll/retry**
  to avoid a race. *The Loom is the real E2E demo; Playwright is a bonus.*
- A tiny MinIO presign integration test (catches the §8.1 host issue before the Loom does).

`make test` runs the required suite; deterministic, no external network.

---

## 13. Security Considerations
- Resumes private; access only via short-lived presigned URLs minted behind auth.
- JWTs verified asymmetrically (EdDSA/JWKS); `iss`/`aud`/`exp` checked; injectable config.
- Input validation on every public field; file type + size limits guard uploads; **filenames
  sanitized** before use as storage keys.
- Better Auth `trustedOrigins` + FastAPI CORS scoped to the frontend origin (+ `Authorization`).
- Secrets only via env; `.env` git-ignored; `.env.example` documents required keys.
- Public signup disabled; attorney accounts seeded/provisioned.
- Deferred + documented (not silent): magic-byte content sniffing, virus scanning, public-form
  rate limiting / captcha.

---

## 14. Trade-offs & "with more time"
- **Email via BackgroundTasks**, not a durable queue — fine for this volume; queue + retries is the upgrade.
- **Single attorney recipient** — a real system routes by practice area / round-robin.
- **One-way state machine** — real CRMs have richer pipelines; minimal per spec.
- **No rate limiting / captcha** on the public form — production needs throttling + spam control.
- **No magic-byte / virus scanning** on uploads — a real intake flow would add both.
- **Cloud deploy is stretch** — local Compose is canonical; hosted brings cold-start, pause, and
  verified-domain-email considerations (§11.2) that aren't worth the critical-path risk.

---

## 15. Coding-Agent Usage (rubric)
Built primarily with the **Claude Code** agent (Claude Opus 4.8), directed and reviewed by the
author. Attribution is continuous (wired up **from the first commit**, not reconstructed later):
- Commits carry `Co-Authored-By` trailers for agent-generated work.
- `docs/agent-usage/NOTES.md` marks agent-generated vs hand-tuned files.
- `docs/agent-usage/prompt-logs/` holds representative prompts/transcript excerpts (incl. this
  adversarial review).
- `docs/agent-usage/WRITEUP.md` (≤ ½ page): tools used, delegate-vs-write split, and **a real
  instance where the agent produced subtly wrong code — caught and fixed** (captured
  authentically during review, not invented).

---

## 16. Submission Checklist
| Artifact | Status target |
|---|---|
| Public GitHub repo | required |
| `RUNNING.md` (run locally) | required |
| `DESIGN.md` (this doc) | required |
| Agent-usage: `WRITEUP.md` + `prompt-logs/` + commit attribution | required |
| **Loom of E2E workflow** (recorded on local Compose) | required |
| Link uploaded within **6h** of start | required |
| `DEPLOYMENT.md` + live URL | **stretch** |

---

## 17. Build Order (de-risked — auth handshake first)
Front-loads both risk axes so a demoable artifact exists early and the riskiest integration is
proven at hour ~1, not discovered at hour ~5.

- **Phase 0 — Scaffold + Compose (~30 min):** repo structure, `docker-compose`
  (postgres/minio/mailpit/backend/frontend), `.env.example`, both apps boot, `/api/health` green.
- **Phase 1 — Core vertical slice, NO auth (~60–75 min):** `leads` + Alembic; `POST /api/leads`
  (multipart → MinIO → persist `PENDING`) → **both emails land in Mailpit**; public `/apply` form.
  *Proves DB + storage + email + the core requirement end-to-end — demoable already.*
- **Phase 2 — Auth handshake as a thin spike (~75–90 min, #1 risk):** Better Auth email+password
  + JWT plugin + JWKS; seed attorney via API; FastAPI `core/security` verifies EdDSA via
  `PyJWKClient` with the §6.2 two-URL config; **prove ONE protected call returns 200 in Docker
  AND in a test** before any dashboard UI. Then lock `GET`/`PATCH` behind `Depends`.
- **Phase 3 — Dashboard UI (~45–60 min):** list + state badge + Mark Reached Out (PATCH) +
  resume download (via `S3_PUBLIC_ENDPOINT`) + middleware protection.
- **Phase 4 — Required tests + docs (~45 min):** the §12 required suite, `RUNNING.md`,
  `.env.example`, agent-usage notes.
- **Phase 5 — Loom on local Compose (~30 min):** record the canonical E2E. Cloud deploy only
  if time remains; it is the first thing to drop to "documented, not live" if behind.
```
