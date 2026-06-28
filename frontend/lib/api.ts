// Centralized API access. The browser calls FastAPI directly (DESIGN.md 2/5.2), so the
// base URL is a public env var. Server-side code can override via API_BASE_URL_INTERNAL.

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export const MAX_RESUME_BYTES = 4 * 1024 * 1024; // keep in sync with backend (4 MB)
export const ALLOWED_RESUME_EXTENSIONS = [".pdf", ".doc", ".docx"];

/** Submit the public lead form (multipart). Returns the raw Response so callers can
 *  branch on status (e.g. 413/415/422) and read the error detail. */
export async function submitLead(formData: FormData): Promise<Response> {
  return fetch(`${API_BASE_URL}/api/leads`, { method: "POST", body: formData });
}

/** Best-effort extraction of a human-readable error from a FastAPI error response. */
export async function readErrorDetail(res: Response): Promise<string> {
  try {
    const body = await res.json();
    if (typeof body.detail === "string") return body.detail;
    if (Array.isArray(body.detail) && body.detail[0]?.msg) {
      return body.detail.map((e: { msg: string }) => e.msg).join("; ");
    }
  } catch {
    /* fall through */
  }
  return `Request failed (${res.status}).`;
}
