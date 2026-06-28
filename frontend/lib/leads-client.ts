"use client";

import { getAccessToken } from "@/lib/auth-client";
import { API_BASE_URL, type Lead, type LeadList } from "@/lib/api";

/** Attach a fresh Better Auth JWT as a Bearer token. On a 401 (the 15-min token may have
 *  expired), mint a new token once and retry — this is the refresh path from DESIGN.md 6.3. */
async function authedFetch(path: string, init: RequestInit = {}, retry = true): Promise<Response> {
  const token = await getAccessToken();
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  if (res.status === 401 && retry) return authedFetch(path, init, false);
  return res;
}

export class UnauthorizedError extends Error {}

async function ok(res: Response, what: string): Promise<Response> {
  if (res.status === 401) throw new UnauthorizedError("Not authenticated");
  if (!res.ok) throw new Error(`Failed to ${what} (${res.status})`);
  return res;
}

export async function fetchLeads(): Promise<LeadList> {
  const res = await ok(await authedFetch("/api/leads?limit=200"), "load leads");
  return res.json();
}

export async function getLead(id: string): Promise<Lead> {
  const res = await ok(await authedFetch(`/api/leads/${id}`), "load lead");
  return res.json();
}

export async function markReachedOut(id: string): Promise<Lead> {
  const res = await ok(
    await authedFetch(`/api/leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ state: "REACHED_OUT" }),
    }),
    "update lead",
  );
  return res.json();
}

export async function updateNotes(id: string, notes: string): Promise<Lead> {
  const res = await ok(
    await authedFetch(`/api/leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes }),
    }),
    "save notes",
  );
  return res.json();
}

/** Fetch a fresh, time-limited presigned URL for the resume (used for preview + download). */
export async function getResumeUrl(id: string): Promise<string> {
  const res = await ok(await authedFetch(`/api/leads/${id}/resume`), "get resume");
  const { url } = (await res.json()) as { url: string };
  return url;
}

/** Open the resume in a new tab. */
export async function downloadResume(id: string): Promise<void> {
  window.open(await getResumeUrl(id), "_blank", "noopener");
}
