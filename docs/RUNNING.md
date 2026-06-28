# Running Alma locally

The entire stack runs in Docker — one command brings up the database, object storage, a mail
catcher, the FastAPI backend, and the Next.js frontend.

## Prerequisites
- **Docker Desktop** (Docker Engine 24+ with Compose v2). Nothing else — Node and Python run
  inside the containers, so you don't need them on your host.
- Ports free on localhost: `3000` (web), `8000` (API), `5432` (Postgres), `9000`/`9001` (MinIO),
  `8025`/`1025` (Mailpit).

## 1. Configure
```bash
cp .env.example .env
```
The committed defaults are the working local values — no edits needed to run locally.

## 2. Start everything
```bash
make up          # = docker compose up --build  (first run pulls images + installs deps)
```
Wait until the logs settle (the backend healthcheck goes healthy in ~10s; the Next.js dev
server prints `✓ Ready`).

## 3. Initialize the database, storage, and the attorney account
In a second terminal:
```bash
make seed
```
This runs the Alembic migrations (creates the `leads` table), runs Better Auth's migrations
(creates the auth tables), creates the MinIO bucket, and seeds the attorney login.

## 4. Open the app
| URL | What |
|---|---|
| http://localhost:3000 | Web app — public form + attorney dashboard |
| http://localhost:3000/apply | Public lead form |
| http://localhost:8000/docs | FastAPI interactive API docs (try every endpoint here) |
| http://localhost:8025 | **Mailpit** — the emails sent on each submission land here |
| http://localhost:9001 | MinIO console (object storage; login `minioadmin`/`minioadmin`) |

### Attorney sign-in (seeded)
- **Email:** `maya.okafor@alma.law`
- **Password:** `almademo2026`

## 5. Try the full flow
1. Go to **/apply**, fill in name + email, attach any PDF/DOC/DOCX (≤ 4 MB), submit.
2. Open **Mailpit** (http://localhost:8025) — you'll see **two** emails: a confirmation to the
   prospect and a "New lead" notification to the attorney.
3. Go to **/login**, sign in as Maya, and you'll see the new lead in the dashboard as **Pending**.
4. Click **Mark reached out** (or open the lead and do it there) — the status flips to
   **Reached out** and the timeline updates. Use the **Download** button to fetch the resume.

## Running the tests
```bash
make test            # backend (pytest, 31) + frontend (vitest, 20)
make test-backend    # backend only
make test-frontend   # frontend only
```

## Useful commands
```bash
make logs        # tail logs from all services
make ps          # service status
make migrate     # re-run DB migrations only
make down        # stop the stack
make down-v      # stop AND wipe volumes (fresh DB + storage)
```

## Troubleshooting
- **A port is already in use** → stop whatever owns it, or edit the published ports in
  `docker-compose.yml`.
- **`make seed` says "Waiting for the auth endpoint…"** → the Next.js dev server is still
  compiling on first run; give it a few seconds and re-run `make seed` (it's idempotent).
- **Dashboard shows no leads / 401** → make sure you ran `make seed` and signed in with the
  seeded credentials above.
- **Reset everything** → `make down-v && make up && make seed`.
