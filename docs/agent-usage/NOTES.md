# Agent Attribution Notes

I (Krish Sharma) designed and directed this project end to end — the architecture, the technology
choices, the requirement interpretations, the UI direction, the build order, and the review gates
are all mine. I used the **Claude Code** agent (Claude Opus 4.8) as the implementer under that
direction, which is exactly the heavy-agent-use this exercise asks for. This file records, per area,
what the agent generated vs. what I owned/hand-tuned, so the split is fully transparent.

## Convention
This file is the project's attribution record (the rubric accepts a NOTES file in lieu of
per-commit co-author trailers). Each phase below lists what was agent-generated vs author-owned;
the commit messages themselves also describe, in prose, what each change generated.
- **Agent-generated:** code/files produced by the Claude Code agent.
- **Author (hand-written / hand-directed):** architecture decisions, the locked technology
  choices, requirement interpretations, prompts, reviews, and the env/secret values. Where the
  author edited agent output by hand, it is noted inline below.

> Summary: **~all source code is agent-generated**; the author's contribution is the
> system design, the decision-making (captured in `docs/DESIGN.md` and the adversarial review),
> the prompting, and the verification at each phase. This is intentional — the assignment
> evaluates *how* agents are used.

---

## Phase 0 — Scaffold + Docker Compose
| File / area | Origin | Notes |
|---|---|---|
| `docs/DESIGN.md` | Agent-generated, author-directed | Decisions chosen by the author; doc revised via an adversarial Planner/Devil's-Advocate agent review (see `prompt-logs/`). |
| `docker-compose.yml`, `Makefile`, `README.md` | Agent-generated | Reviewed by author. |
| `backend/` (FastAPI app, config, db session, health, storage client, Dockerfile) | Agent-generated | Reviewed by author. |
| `frontend/` (Next.js scaffold, landing page, Dockerfile) | Agent-generated | Reviewed by author. |
| `.env.example` | Agent-generated | Local secret *values* in `.env` set by author (git-ignored). |

**Verification (author-run via agent):** `docker compose up` → all 5 services healthy;
`/api/health` returns `{db: ok, storage: ok}`; frontend renders; Mailpit + MinIO consoles reachable;
`make seed` creates the storage bucket.

## Notable agent mistake caught & fixed (for the writeup)
**XSS / HTML injection in email templates** (`backend/app/services/email/templates.py`).
The agent's first version interpolated user-controlled values (prospect first/last name, email)
directly into the **HTML** email body without escaping — so a prospect submitting
`<img src=x onerror=...>` as their name would inject markup into the email the *attorney* opens.
Caught by the automated security review, confirmed real, and fixed by HTML-escaping every
interpolated value (`html.escape`, with `quote=True` for the href URL) while leaving the
plain-text body intact. Verified with an explicit payload test. This is a representative example
of subtly unsafe agent output and how the review/verify loop caught it.

**Caught by the test suite (Phase 4):** the `POST /api/leads` validation handler passed
Pydantic's raw `ValidationError.errors()` as the HTTP detail. Those error dicts embed the
original `ValueError` object in `ctx`, which is **not JSON-serializable** — so an invalid
submission would have 500'd instead of returning a clean 422. The integration test
`test_post_lead_validation_error` failed on exactly this; fixed with
`errors(include_url=False, include_context=False, include_input=False)`. Verified live: a bad
submission now returns a structured 422.

**From the inline-PDF-preview feature (fixed):** adding an in-app PDF preview, the agent served
the resume with `Content-Disposition: inline` and a content-type echoed from the upload — a
classic stored-XSS pattern (a non-PDF could render as HTML/SVG in the attorney's browser). The
commit security review flagged it; hardened so the inline path only ever serves genuine PDFs and
**forces `application/pdf`** (never an upload-influenced type). Verified: PDF → inline, DOCX
requested inline → falls back to attachment.

**Two more from the commit-level security review (fixed):**
- *HTTP header injection via `Content-Disposition`* (`storage.py`): the presigned-URL helper
  embedded the original filename into the header; a CRLF/quote payload could split the header.
  Fixed by sanitizing the filename to printable ASCII without quotes/CR/LF. Verified with a payload.
- *Unbounded upload read* (`routes_leads.py`): the whole upload was read into memory before the
  size check (memory-exhaustion DoS). Fixed by reading at most `max+1` bytes, then rejecting >max
  with `413`. Verified a ~5 MB upload is rejected and a normal one still succeeds.

**Acknowledged, not a code change now — intentional sequencing:** the review also flagged the
GET/PATCH/`/resume` lead endpoints as unauthenticated (PII exposure). This is **deliberate**: the
design (DESIGN.md §17) sequences the Better Auth ↔ JWKS guard as Phase 2, which is next, and the
stack is local-only (not deployed). Those endpoints get `require_attorney` in Phase 2; a full
security pass (security-review skill) runs in Phase 4 to close any remaining items.
> Closed in Phase 2: those endpoints now return 401 without a valid attorney JWT.

## Phase 2 — Auth (Better Auth ↔ FastAPI JWKS)
Agent-generated, **with the agent first consulting the official Better Auth docs** (jwt plugin,
Next.js integration, installation) via WebFetch before writing code — exactly the "verify SDK
usage against docs" discipline, given this was the riskiest integration. Files: `frontend/lib/auth.ts`,
`frontend/app/api/auth/[...all]/route.ts`, `frontend/lib/auth-client.ts`, `backend/app/core/security.py`
(injectable JWKS/issuer/audience for testability), endpoint guards in `routes_leads.py`,
`scripts/seed-attorney.sh`. Verified the full spike: seed → sign-in → mint EdDSA JWT →
protected call 200, bogus token 401; auth tables coexist with `leads` (Alembic filter holds).

## Nice-to-have features (author-requested, agent-built)
Eight extras, each built + tested + verified in a real browser:
- **Backend:** attorney notes (column + migration + PATCH), magic-byte resume validation
  (rejects a renamed file with 415), per-IP rate limiting on the public form (429). +5 tests.
- **Frontend:** dashboard search (name/email), sortable columns, CSV export, duplicate-email
  ("Re-application") flag; lead-detail private notes (save/persist) + inline PDF resume preview.
- Verified live: spoofed .pdf → 415, notes round-trip to the DB, search filters, duplicate flag
  on the newer of two same-email leads, PDF preview iframe loads the presigned URL.

## Phase 3 — Internal dashboard UI (from the Claude Design handoff)
Agent-generated implementation of the design's Login, Dashboard, and Lead-detail screens,
wired to the real authed API. `frontend/app/login/page.tsx` (Better Auth sign-in),
`frontend/app/dashboard/page.tsx` (filter tabs, skeleton/empty states, rows with mark-reached/
download, `useSession` for the real attorney identity), `frontend/app/dashboard/[id]/page.tsx`
(contact, resume, timeline). `frontend/lib/leads-client.ts` (Bearer + refetch-on-401),
`frontend/middleware.ts` (route guard). The design (Alma.dc.html) was authored by the user via
Claude Design; pixel-faithful re-creation + live API/auth wiring by the agent. Verified: tsc
clean, login renders, dashboard redirects when unauthenticated. Full interactive E2E in Phase 5.
