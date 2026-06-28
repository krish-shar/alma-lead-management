import { describe, expect, it } from "vitest";
import type { Lead } from "@/lib/api";
import { leadsToCsv } from "@/lib/csv";

function makeLead(over: Partial<Lead> & { id: string }): Lead {
  return {
    first_name: "Ada",
    last_name: "Lovelace",
    email: "ada@example.com",
    resume_filename: "cv.pdf",
    state: "PENDING",
    notes: "",
    created_at: "2026-06-01T00:00:00Z",
    updated_at: "2026-06-01T00:00:00Z",
    reached_out_at: null,
    ...over,
  };
}

describe("leadsToCsv", () => {
  it("emits a header row and one row per lead", () => {
    const csv = leadsToCsv([makeLead({ id: "1" }), makeLead({ id: "2", first_name: "Grace" })]);
    const lines = csv.split("\n");
    expect(lines).toHaveLength(3);
    expect(lines[0]).toContain("Email");
    expect(lines[1]).toContain("ada@example.com");
    expect(lines[2]).toContain("Grace");
  });

  it("escapes commas and quotes per RFC 4180", () => {
    const csv = leadsToCsv([makeLead({ id: "1", first_name: 'Smith, Jr "the great"' })]);
    expect(csv).toContain('"Smith, Jr ""the great"""');
  });

  it("renders a blank reached-out cell when null", () => {
    const csv = leadsToCsv([makeLead({ id: "1", reached_out_at: null })]);
    expect(csv.trim().split("\n")[1].endsWith(",")).toBe(true);
  });
});
