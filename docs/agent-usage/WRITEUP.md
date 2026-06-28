# Coding-agent usage — writeup

**My approach.** I treated this as an orchestration problem, not a typing problem. I owned the
engineering decisions and the quality bar; I used a coding agent as a fast, accurate implementer
that I kept on a short leash. Heavy agent use is the point of this exercise, so I leaned in hard —
but every consequential choice, and every "is this actually correct?" gate, was mine.

**My process (what I think is worth seeing).** Before writing any code I ran a structured design
phase and then stress-tested my system design with an **adversarial review** — I had two
independent agents argue the design from opposite sides (one defending, one attacking). That review
changed my plan in two ways that mattered: it surfaced that **free-tier Resend can't email an
arbitrary prospect without a verified domain**, so I made local Docker the canonical demo; and it
flagged two container-vs-browser URL footguns (the JWKS fetch URL vs. the token's issuer/audience,
and the S3 internal vs. public endpoint) that I designed around *before* they could cost me hours.
From there I built in verified phases — I didn't let a phase land until I'd seen it work against the
running system.

**Tools.** Claude Code (Claude Opus 4.8) for implementation under my direction; Claude Design for
the UI, which I art-directed and then had rebuilt in the real Next.js/Tailwind stack to my spec; a
headless browser I drove for end-to-end verification; and an automated security review on my commits.

**What I decided vs. delegated.** I made the calls that shape the system: the stack (FastAPI,
Next.js, Postgres, Better Auth), **asymmetric JWKS verification over a simpler shared-secret proxy**,
the requirement interpretations (e.g. "update a lead" = a reversible state transition, not a CRUD
editor), the data model, the UI direction, the auth hardening, and the phased build order. One
concrete override: when the agent reached for a **hard delete** on the dashboard, I redirected it to
a **soft delete** — an immigration firm must never be able to destroy applicant records, and the
action should be reversible. The agent then implemented the `deleted_at` column, the listing filter,
the migration, and the tests; the architectural call was mine. I delegated the mechanical
implementation — scaffolding, the CRUD/storage/email plumbing, migrations, the auth wiring, the React
components, the test suite — and I reviewed each phase against running evidence (curl, the test suite,
a real browser) before moving on.

**Where the agent was subtly wrong — and how I caught it.** The clearest case: the agent's first
cut of the transactional **email templates interpolated the prospect's name and email straight into
the HTML body without escaping**. A prospect submitting `<img src=x onerror=...>` as their name would
have injected markup into the email *my attorney* opens — stored XSS through the lead pipeline. The
automated security review I'd wired in flagged it; I confirmed it was genuinely exploitable, then
fixed it by HTML-escaping every interpolated value (and the href via `quote=True`) while leaving the
plain-text body intact, and I locked it down with an explicit payload test. The same verify-don't-
trust discipline caught three more: a `422` handler that returned Pydantic's non-serializable raw
errors (would have 500'd on any invalid submission — caught by an integration test I wrote), plus a
`Content-Disposition` header-injection and an unbounded upload read (both from the security review).
My throughline: agent output that *looks* right isn't *verified* right until it's run — so I built
the verification (a real pytest + frontend test suite, a security review, a browser E2E pass) that
turns "looks done" into "is done."

> Per-file attribution: `docs/agent-usage/NOTES.md`. Representative prompts:
> `docs/agent-usage/prompt-logs/`.
