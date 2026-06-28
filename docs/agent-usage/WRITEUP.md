# Coding-agent usage — writeup

**Approach.** I treated this as an orchestration problem, not a typing problem: I owned every
engineering decision and the quality bar, and used a coding agent as a fast, accurate implementer
on a short leash. Heavy agent use is the point of this exercise, so I leaned in hard — but every
consequential choice, and every "is this actually correct?" gate, was mine.

**Tools.** Claude Code (Claude Opus 4.8) for implementation under my direction; Claude Design for
the UI, which I art-directed and then had rebuilt in the real Next.js/Tailwind stack; a headless
browser I drove for end-to-end verification; and an automated security review on my commits.

**Decided vs. delegated.** Mine: the stack (FastAPI, Next.js, Postgres, Better Auth), **asymmetric
JWKS verification over a shared-secret proxy**, the requirement interpretations ("update a lead" =
a reversible state transition, not a CRUD editor), the data model, the auth hardening, and the
phased build order. Before writing code I stress-tested the design with an **adversarial two-agent
review** (one defending, one attacking); it caught that free-tier Resend can't email an arbitrary
prospect (so local Docker became the canonical demo) and two container-vs-browser URL footguns —
before they cost hours. One override worth flagging: when the agent reached for a **hard delete**,
I redirected it to a **soft delete** — an immigration firm must never destroy applicant records.
I delegated the mechanical implementation (scaffolding, storage/email plumbing, migrations, auth
wiring, React components, the test suite) and reviewed each phase against running evidence.

**Where the agent was subtly wrong — and how I caught it.** Its first email templates interpolated
the prospect's name straight into the **HTML** body without escaping — stored XSS into the email my
*attorney* opens. The security review I'd wired in flagged it; I confirmed it was genuinely
exploitable and fixed it by HTML-escaping every interpolated value, locked in with a payload test.
The same verify-don't-trust discipline caught three more (a non-serializable `422`, a
`Content-Disposition` header injection, an unbounded upload read). Agent output that *looks* right
isn't *verified* right until it's run — so I built the suite (pytest + frontend tests, a security
review, a browser E2E) that turns "looks done" into "is done."

> Per-file attribution: `docs/agent-usage/NOTES.md`. Representative prompts:
> `docs/agent-usage/prompt-logs/`.
