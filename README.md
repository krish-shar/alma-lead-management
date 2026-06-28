# Alma — Lead Management System

A publicly accessible lead-intake form (name, email, resume) that emails both the prospect
and a company attorney on submission, plus an auth-gated internal dashboard where attorneys
review leads and advance them through a `PENDING → REACHED_OUT` state machine.

- **Backend:** FastAPI · SQLAlchemy 2.0 · Alembic · PostgreSQL
- **Frontend:** Next.js (App Router) · TypeScript · Tailwind · Better Auth
- **Storage:** S3-compatible (MinIO local / Supabase hosted) · **Email:** SMTP→Mailpit local / Resend hosted
- **Auth:** Better Auth issues EdDSA JWTs; FastAPI verifies them via JWKS

## Quick start

```bash
cp .env.example .env      # local defaults work as-is
make up                   # build + start: db, storage, mail, backend, frontend
make seed                 # bootstrap storage bucket (+ migrations/attorney in later phases)
```

Then open:

| URL | What |
|---|---|
| http://localhost:3000 | Web app (public form + attorney dashboard) |
| http://localhost:8000/docs | FastAPI interactive API docs |
| http://localhost:8000/api/health | Health check (db + storage) |
| http://localhost:8025 | Mailpit inbox (see the emails that get sent) |
| http://localhost:9001 | MinIO console (object storage) |

## Documentation
- [`docs/DESIGN.md`](docs/DESIGN.md) — system design & rationale
- [`docs/RUNNING.md`](docs/RUNNING.md) — detailed local run guide
- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) — free hosting (stretch)
- [`docs/agent-usage/`](docs/agent-usage/) — coding-agent usage writeup, prompt logs, attribution
