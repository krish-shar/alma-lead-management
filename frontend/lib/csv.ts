import type { Lead } from "@/lib/api";

function cell(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** Generate a CSV of the given leads and trigger a browser download. */
export function exportLeadsCsv(leads: Lead[]): void {
  const header = ["First name", "Last name", "Email", "Status", "Submitted", "Reached out"];
  const rows = leads.map((l) =>
    [l.first_name, l.last_name, l.email, l.state, l.created_at, l.reached_out_at ?? ""]
      .map((v) => cell(String(v)))
      .join(","),
  );
  const csv = [header.join(","), ...rows].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `alma-leads-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
