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
