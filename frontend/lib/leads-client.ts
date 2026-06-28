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

/** Set a lead's outreach state. `reached` advances to REACHED_OUT; `false` is the explicit
 *  undo back to PENDING (the backend clears the reached-out timestamp). */
export async function setReachedOut(id: string, reached: boolean): Promise<Lead> {
  const res = await ok(
    await authedFetch(`/api/leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ state: reached ? "REACHED_OUT" : "PENDING" }),
    }),
    "update lead",
  );
  return res.json();
}

export function markReachedOut(id: string): Promise<Lead> {
  return setReachedOut(id, true);
}

/** Soft delete: the lead is hidden from every listing/detail, but its row + resume are
 *  retained server-side (applicant data is never hard-destroyed). */
export async function deleteLead(id: string): Promise<void> {
  await ok(await authedFetch(`/api/leads/${id}`, { method: "DELETE" }), "delete lead");
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

/** Fetch a fresh, time-limited presigned URL for the resume.
 *  `inline` → render in the browser (preview); default → download with the original filename. */
export async function getResumeUrl(id: string, opts?: { inline?: boolean }): Promise<string> {
  const qs = opts?.inline ? "?inline=true" : "";
  const res = await ok(await authedFetch(`/api/leads/${id}/resume${qs}`), "get resume");
  const { url } = (await res.json()) as { url: string };
  return url;
}

/** Open the resume in a new tab (attachment download). */
export async function downloadResume(id: string): Promise<void> {
  window.open(await getResumeUrl(id), "_blank", "noopener");
}
