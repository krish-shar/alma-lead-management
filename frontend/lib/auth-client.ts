"use client";

import { jwtClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

// baseURL is inferred from window.location.origin (same-origin /api/auth/*).
// jwtClient() enables authClient.token() to mint the bearer JWT the dashboard sends to FastAPI.
export const authClient = createAuthClient({
  plugins: [jwtClient()],
});

export const { signIn, signOut, useSession } = authClient;

/** Fetch a fresh EdDSA JWT for authenticating requests to the FastAPI backend. */
export async function getAccessToken(): Promise<string | null> {
  const { data } = await authClient.token();
  return data?.token ?? null;
}
