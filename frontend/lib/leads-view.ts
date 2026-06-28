// Pure view-logic for the leads dashboard (duplicate detection, filtering, sorting).
// Extracted from the dashboard component so it can be unit-tested in isolation.

import { fullName, type Lead } from "@/lib/api";

export type Filter = "ALL" | "PENDING" | "REACHED_OUT";
export type SortKey = "name" | "status" | "submitted";
export type Sort = { key: SortKey; dir: "asc" | "desc" };

/** Ids of leads whose email matches an EARLIER submission (a re-application). The earliest
 *  lead for a given email is the original; every later one is flagged. */
export function computeDuplicateIds(leads: Lead[]): Set<string> {
  const byEmail = new Map<string, Lead[]>();
  for (const lead of leads) {
    const key = lead.email.toLowerCase();
    const list = byEmail.get(key) ?? [];
    list.push(lead);
    byEmail.set(key, list);
  }
  const duplicates = new Set<string>();
  for (const group of byEmail.values()) {
    if (group.length > 1) {
      [...group]
        .sort((a, b) => a.created_at.localeCompare(b.created_at))
        .slice(1)
        .forEach((lead) => duplicates.add(lead.id));
    }
  }
  return duplicates;
}

/** Apply the status filter + free-text search, then sort. Returns a new array. */
export function visibleLeads(leads: Lead[], filter: Filter, query: string, sort: Sort): Lead[] {
  const q = query.trim().toLowerCase();
  let out = filter === "ALL" ? leads : leads.filter((l) => l.state === filter);
  if (q) {
    out = out.filter(
      (l) => fullName(l).toLowerCase().includes(q) || l.email.toLowerCase().includes(q),
    );
  }
  const dir = sort.dir === "asc" ? 1 : -1;
  return [...out].sort((a, b) => {
    if (sort.key === "name") return fullName(a).localeCompare(fullName(b)) * dir;
    if (sort.key === "status") return a.state.localeCompare(b.state) * dir;
    return a.created_at.localeCompare(b.created_at) * dir;
  });
}
