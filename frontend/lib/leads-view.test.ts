import { describe, expect, it } from "vitest";
import type { Lead } from "@/lib/api";
import { computeDuplicateIds, type Sort, visibleLeads } from "@/lib/leads-view";

function makeLead(over: Partial<Lead> & { id: string }): Lead {
  return {
    first_name: "First",
    last_name: "Last",
    email: "a@b.com",
    resume_filename: "cv.pdf",
    state: "PENDING",
    notes: "",
    created_at: "2026-06-01T00:00:00Z",
    updated_at: "2026-06-01T00:00:00Z",
    reached_out_at: null,
    ...over,
  };
}

const SUBMITTED_DESC: Sort = { key: "submitted", dir: "desc" };

describe("computeDuplicateIds", () => {
  it("flags the later of two same-email leads, not the original", () => {
    const first = makeLead({ id: "1", email: "x@y.com", created_at: "2026-06-01T00:00:00Z" });
    const later = makeLead({ id: "2", email: "x@y.com", created_at: "2026-06-02T00:00:00Z" });
    const other = makeLead({ id: "3", email: "z@y.com" });
    const dups = computeDuplicateIds([first, later, other]);
    expect(dups.has("2")).toBe(true);
    expect(dups.has("1")).toBe(false);
    expect(dups.has("3")).toBe(false);
  });

  it("matches emails case-insensitively", () => {
    const a = makeLead({ id: "1", email: "X@Y.com", created_at: "2026-06-01T00:00:00Z" });
    const b = makeLead({ id: "2", email: "x@y.com", created_at: "2026-06-02T00:00:00Z" });
    expect(computeDuplicateIds([a, b]).has("2")).toBe(true);
  });
});

describe("visibleLeads", () => {
  const ada = makeLead({ id: "ada", first_name: "Ada", last_name: "Lovelace", email: "ada@x.com", state: "PENDING", created_at: "2026-06-01T00:00:00Z" });
  const grace = makeLead({ id: "grace", first_name: "Grace", last_name: "Hopper", email: "grace@x.com", state: "REACHED_OUT", created_at: "2026-06-05T00:00:00Z" });

  it("filters by status", () => {
    expect(visibleLeads([ada, grace], "PENDING", "", SUBMITTED_DESC).map((l) => l.id)).toEqual(["ada"]);
    expect(visibleLeads([ada, grace], "REACHED_OUT", "", SUBMITTED_DESC).map((l) => l.id)).toEqual(["grace"]);
  });

  it("searches by name and email", () => {
    expect(visibleLeads([ada, grace], "ALL", "hopp", SUBMITTED_DESC).map((l) => l.id)).toEqual(["grace"]);
    expect(visibleLeads([ada, grace], "ALL", "ada@", SUBMITTED_DESC).map((l) => l.id)).toEqual(["ada"]);
    expect(visibleLeads([ada, grace], "ALL", "nobody", SUBMITTED_DESC)).toHaveLength(0);
  });

  it("sorts by submitted date both directions", () => {
    expect(visibleLeads([ada, grace], "ALL", "", { key: "submitted", dir: "desc" }).map((l) => l.id)).toEqual(["grace", "ada"]);
    expect(visibleLeads([ada, grace], "ALL", "", { key: "submitted", dir: "asc" }).map((l) => l.id)).toEqual(["ada", "grace"]);
  });

  it("sorts by name", () => {
    expect(visibleLeads([grace, ada], "ALL", "", { key: "name", dir: "asc" }).map((l) => l.id)).toEqual(["ada", "grace"]);
  });

  it("does not mutate the input array", () => {
    const input = [grace, ada];
    visibleLeads(input, "ALL", "", { key: "name", dir: "asc" });
    expect(input.map((l) => l.id)).toEqual(["grace", "ada"]);
  });
});
