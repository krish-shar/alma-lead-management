# Agent Attribution Notes

This project was built using the **Claude Code** agent (model: **Claude Opus 4.8**), directed
and reviewed by the author (Krish Sharma). This file records, per area, what was
agent-generated vs. hand-written, so the split is transparent for evaluation.

## Convention
- **Agent-generated:** code/files produced by the Claude Code agent. Every such commit carries
  a `Co-Authored-By: Claude Opus 4.8 ...` trailer.
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
