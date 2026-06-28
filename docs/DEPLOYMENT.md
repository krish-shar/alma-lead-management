# Deployment (free tier) — stretch goal

> Local Docker Compose is the canonical, graded environment (see `RUNNING.md`). This document
> describes the optional free-hosting path. Because every dependency is reached through a
> portable protocol and configured via environment variables (DESIGN.md §2.1), deploying is a
> configuration exercise — no code changes.

**Target:** Supabase (Postgres + Storage) · Vercel (Next.js) · Render (FastAPI) · Resend (email).

## 0. Know the two URL-pair gotchas before you start (DESIGN.md §6.2, §8.1)
- **JWKS:** `JWT_JWKS_URL` is where the backend *fetches* keys (the Vercel URL); `JWT_ISSUER`
  and `JWT_AUDIENCE` are what the token *carries* (also the Vercel URL — Better Auth sets both
  to its `BETTER_AUTH_URL`).
- **Storage:** `S3_PUBLIC_ENDPOINT` is used to *sign* download URLs the browser opens; it must
  be the publicly reachable Supabase S3 host, not an internal one.

## 1. Supabase (database + object storage)
1. Create a project (no credit card on the free tier). Note the **Postgres connection string**.
2. Create a **Storage bucket** named `resumes` (keep it private).
3. In Storage settings, enable **S3 access** and create S3 access keys. Note the **S3 endpoint**,
   **region**, access key, and secret.

## 2. Resend (email)
1. Add and **verify your domain** (SPF/DKIM/DMARC DNS records). This is what allows sending to
   arbitrary recipients (the prospect + the attorney). Without a verified domain the free tier
   only delivers to your own address.
2. Create an **API key**.

## 3. Backend → Render (FastAPI)
1. New **Web Service** from the repo, root `backend/`, using the `Dockerfile`.
2. Set environment variables:
   ```
   DATABASE_URL=postgresql+psycopg://<supabase pooled connection>
   S3_INTERNAL_ENDPOINT=<supabase S3 endpoint>
   S3_PUBLIC_ENDPOINT=<supabase S3 endpoint>
   S3_BUCKET=resumes
   S3_ACCESS_KEY=<supabase s3 key>   S3_SECRET_KEY=<supabase s3 secret>
   S3_REGION=<supabase region>       S3_ADDRESSING_STYLE=virtual
   EMAIL_PROVIDER=resend             RESEND_API_KEY=<key>
   EMAIL_FROM="Alma Immigration <noreply@yourdomain>"
   ATTORNEY_EMAIL=<attorney inbox>   PUBLIC_APP_URL=https://<your-vercel-app>
   FRONTEND_ORIGIN=https://<your-vercel-app>
   JWT_JWKS_URL=https://<your-vercel-app>/api/auth/jwks
   JWT_ISSUER=https://<your-vercel-app>   JWT_AUDIENCE=https://<your-vercel-app>
   ```
3. **Pre-deploy command:** `alembic upgrade head` (creates the `leads` table on Supabase).
4. Note the service URL, e.g. `https://alma-api.onrender.com`.

## 4. Frontend → Vercel (Next.js)
1. Import the repo, root `frontend/`.
2. Set environment variables:
   ```
   BETTER_AUTH_URL=https://<your-vercel-app>
   BETTER_AUTH_SECRET=<32+ char secret>
   BETTER_AUTH_DATABASE_URL=postgresql://<supabase direct connection>
   NEXT_PUBLIC_API_BASE_URL=https://<your-render-api>
   ```
3. Deploy, then run Better Auth's migration against Supabase once:
   `npx @better-auth/cli migrate -y` (locally, with `BETTER_AUTH_DATABASE_URL` pointed at Supabase).

## 5. Seed the attorney
With the frontend live, create the attorney account once:
```bash
curl -X POST https://<your-vercel-app>/api/auth/sign-up/email \
  -H 'Content-Type: application/json' \
  -d '{"name":"Maya Okafor","email":"maya.okafor@alma.law","password":"<a strong password>"}'
```

## 6. Smoke test
Submit a lead on the live `/apply`, confirm both emails arrive (Resend dashboard / inboxes),
sign in, and verify the lead + resume download in the dashboard.

## Known free-tier caveats
- **Render** free services **spin down after ~15 min idle** (~1 min cold start). Pre-warm the
  API (hit `/api/health`) before demoing, since the first request also triggers the JWKS fetch.
- **Supabase** free projects **pause after ~7 days of DB inactivity** — unpause from the dashboard.
- **Resend** sending to arbitrary recipients **requires the verified domain** from step 2.
