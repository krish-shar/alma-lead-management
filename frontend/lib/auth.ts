import { betterAuth } from "better-auth";
import { jwt } from "better-auth/plugins";
import { Pool } from "pg";

// Better Auth owns the auth tables in the SAME Postgres as the backend (disjoint tables;
// the backend's Alembic env filters these out). The jwt() plugin exposes:
//   GET /api/auth/jwks   — public keys (FastAPI verifies tokens against these)
//   GET /api/auth/token  — mints a short-lived EdDSA JWT for the signed-in user
// Defaults (verified against docs): EdDSA/Ed25519, iss & aud = baseURL, 15-min expiry.
export const auth = betterAuth({
  database: new Pool({
    connectionString: process.env.BETTER_AUTH_DATABASE_URL,
  }),
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  secret: process.env.BETTER_AUTH_SECRET,
  trustedOrigins: [process.env.BETTER_AUTH_URL ?? "http://localhost:3000"],
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 10,
    maxPasswordLength: 128,
    // Staff can self-provision via /signup. Open for local/demo use; a production deploy
    // would gate this (invite-only / admin-created accounts) and add MFA.
  },
  // Session lifetime: 7-day expiry, refreshed daily on activity.
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
  // Brute-force protection. Enabled in dev too (Better Auth only auto-enables in prod).
  // Sign-in is tightly limited per IP; session polling is exempt so the dashboard stays snappy.
  rateLimit: {
    enabled: true,
    window: 60,
    max: 100,
    customRules: {
      "/sign-in/email": { window: 60, max: 5 },
      "/get-session": false,
    },
  },
  plugins: [jwt()],
});
