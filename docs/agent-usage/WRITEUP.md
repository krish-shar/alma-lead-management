# Coding-agent usage — writeup

**Tools.** Primary agent: **Claude Code (Claude Opus 4.8)**, driving the whole build. The UI was
designed separately in **Claude Design** (claude.ai/design) and handed off as an HTML/CSS
prototype, which the agent re-created in the real Next.js + Tailwind stack. Inside Claude Code I
also leaned on three sub-capabilities: an **adversarial-planning** team (a "Planner" and a
"Devil's Advocate" subagent that independently researched and debated the design before any code),
a **headless browser** for end-to-end verification, and the **automated security review** that
runs on changes.

**What I delegated vs. wrote myself.** I delegated essentially all of the *implementation* —
scaffolding, the FastAPI/SQLAlchemy/Alembic backend, the Better Auth ↔ JWKS auth, the Next.js
frontend, Docker Compose, and the test suite. What I kept for myself was the *judgement*: locking
the stack (FastAPI, Next.js, Postgres, Better Auth, Supabase), choosing asymmetric **JWKS
verification over a simpler shared-secret BFF**, deciding to make **local Docker the canonical
deliverable and cloud deploy a stretch** (after the adversarial review showed free-tier Resend
can't email arbitrary recipients without a verified domain), interpreting the ambiguous
requirements, designing the UI, and reviewing/verifying each phase. The division reflects where
each side has leverage: the agent is fast and accurate at mechanical, well-specified work; my
value is in decisions, taste, and insisting on evidence.

**Where the agent produced subtly bad code — and how I caught it.** The clearest example: the
agent's first version of the transactional **email templates interpolated the prospect's name and
email directly into the HTML body without escaping**. A prospect submitting
`<img src=x onerror=...>` as their name would have injected markup/script into the email the
*attorney* opens — a stored-XSS via the lead pipeline. The automated **security review flagged it**,
I confirmed it was genuinely exploitable, and the fix was to HTML-escape every interpolated value
(`html.escape`, `quote=True` for the href) while leaving the plain-text body intact; I verified it
with an explicit payload test. Verification caught three more issues the same way: a **422 handler
that passed Pydantic's non-serializable raw `errors()`** (would have 500'd on any invalid
submission — caught by an integration test), and two from the security review (**Content-Disposition
header injection** and an **unbounded upload read** before the size check). The throughline: don't
trust agent output because it looks right — run it. Layered verification (a real pytest suite +
automated security review + a headless-browser E2E pass) is what turned "looks done" into "is done."

> Full per-file attribution: `docs/agent-usage/NOTES.md`. Representative prompts:
> `docs/agent-usage/prompt-logs/`.
