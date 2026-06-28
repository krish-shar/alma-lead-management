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
    // Internal tool: there is no public sign-up UI; attorneys are provisioned via the
    // seed script. (A production deploy would set disableSignUp + an invite flow.)
  },
  plugins: [jwt()],
});
