# Representative prompt logs / session excerpts

Excerpts from the Claude Code session that built this project. Lightly trimmed; they show how
the work was directed — decisions and verification by the author, implementation by the agent.

---

### 1. Kickoff — process before code
> **Author:** "We are going to be working on a large-scale take-home assignment. You are first to
> set up a Git repository and then when I paste in the question, we will go through some
> discussions. You will then come up with a finalized plan that you will then track throughout…
> We will not move on without confirming anything… No placeholders, no feeder code — everything
> end-to-end and done."

Agent set up the repo, then on receiving the assignment ran a structured brainstorm instead of
jumping to code.

---

### 2. Decisions the author made (not the agent)
In response to the agent's clarifying questions, the author chose the stack and constraints:
> **Author:** "I would like to get this deployed as well (for free) so think about the best way…
> We can start with local dev stuff then get to the rest."
> **Author:** "I like betterauth."
> **Author (on hosting):** selected **Supabase (DB+storage) + Vercel + Render + Resend**.
> **Author (on auth wiring):** selected **JWT + JWKS verification** (FastAPI verifies Better
> Auth's tokens) over a shared-secret proxy.

---

### 3. Adversarial review of the design (author-requested)
> **Author:** "Can you use an adversarial planner agent to view your design and confirm everything
> about it."

The agent spun up two independent subagents. Their dispatch prompts (abbreviated):
> **Planner:** "Independently verify this design satisfies the assignment, own it as your plan,
> and identify gaps you'd fix. Verify the Better Auth→FastAPI JWKS feasibility (algorithm + the
> exact Python library) with web search if unsure."
> **Devil's Advocate:** "Find every weakness. Probe hard: can free-tier Resend email an arbitrary
> prospect AND attorney? Render cold-starts? Supabase S3 presigned URLs? the two URL-context
> footguns? Is this over-scoped for 6 hours?"

Headline findings that changed the plan: free-tier **Resend can't email arbitrary recipients
without a verified domain** (so local Mailpit became the canonical demo), a **live URL isn't
required** by the brief (cloud demoted to stretch), and two container-vs-browser URL footguns
(**JWKS fetch URL vs issuer/audience**, **S3 internal vs public endpoint**) were designed around
before any code.

---

### 4. UI design handoff (Claude Design)
The author generated the UI in Claude Design from an agent-written megaprompt, e.g.:
> "Design a cohesive, distinctive, production-grade UI for 'Alma'… trustworthy, calm, human…
> Newsreader/Hanken type pairing, warm paper canvas, one confident accent… screens: landing,
> /apply, /login, /dashboard, /dashboard/[id]… avoid generic AI defaults (no purple gradient
> hero, no emoji icons)…"

The exported HTML prototype was then re-created in the real Next.js + Tailwind stack and wired to
the live API.

---

### 5. Verification discipline (recurring)
> **Author:** "Be sure to test your code as you write it."

This drove a test-as-you-go loop: each phase was verified with real evidence (curl against the
running API, a pytest suite, and a headless-browser E2E that signed in and exercised the
dashboard) before being committed. Two examples where verification caught real defects:
- The **security review** flagged an unescaped-HTML XSS in the email templates → fixed + payload-tested.
- An **integration test** failed on the `POST /api/leads` 422 handler returning a non-serializable
  Pydantic error object → fixed to a clean structured 422.
