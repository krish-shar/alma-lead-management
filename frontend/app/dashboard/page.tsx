"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Logo } from "@/components/Logo";
import { StatusBadge } from "@/components/StatusBadge";
import { Toast, useToast } from "@/components/Toast";
import { ChevronRight, Download, SignOut, Trash, Undo } from "@/components/icons";
import { fmtDate, fullName, initials, type Lead } from "@/lib/api";
import { signOut, useSession } from "@/lib/auth-client";
import { exportLeadsCsv } from "@/lib/csv";
import { deleteLead, downloadResume, fetchLeads, setReachedOut, UnauthorizedError } from "@/lib/leads-client";
import {
  computeDuplicateIds,
  type Filter,
  type Sort,
  type SortKey,
  visibleLeads,
} from "@/lib/leads-view";

function nameInitials(name?: string | null): string {
  if (!name) return "··";
  return name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

export default function DashboardPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const { toast, showToast } = useToast();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("ALL");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>({ key: "submitted", dir: "desc" });

  useEffect(() => {
    let active = true;
    fetchLeads()
      .then((data) => active && setLeads(data.items))
      .catch((err) => {
        if (err instanceof UnauthorizedError) router.replace("/login");
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [router]);

  const pendingCount = useMemo(() => leads.filter((l) => l.state === "PENDING").length, [leads]);
  const reachedCount = leads.length - pendingCount;

  const duplicateIds = useMemo(() => computeDuplicateIds(leads), [leads]);
  const rows = useMemo(
    () => visibleLeads(leads, filter, query, sort),
    [leads, filter, query, sort],
  );

  const toggleSort = (key: SortKey) =>
    setSort((s) =>
      s.key === key
        ? { key, dir: s.dir === "asc" ? "desc" : "asc" }
        : { key, dir: key === "submitted" ? "desc" : "asc" },
    );

  const onSetReached = useCallback(
    async (id: string, reached: boolean) => {
      try {
        const updated = await setReachedOut(id, reached);
        setLeads((prev) => prev.map((l) => (l.id === id ? updated : l)));
        showToast(reached ? "Marked as reached out." : "Moved back to pending.");
      } catch {
        showToast("Couldn’t update that lead — please retry.");
      }
    },
    [showToast],
  );

  const onDelete = useCallback(
    async (id: string) => {
      try {
        await deleteLead(id);
        setLeads((prev) => prev.filter((l) => l.id !== id));
        showToast("Lead deleted.");
      } catch {
        showToast("Couldn’t delete that lead — please retry.");
      }
    },
    [showToast],
  );

  const onDownload = useCallback(
    async (lead: Lead) => {
      showToast(`Preparing ${lead.resume_filename}…`, 2200);
      try {
        await downloadResume(lead.id);
      } catch {
        showToast("Couldn’t prepare that download.");
      }
    },
    [showToast],
  );

  async function handleSignOut() {
    await signOut();
    router.push("/login");
  }

  return (
    <div className="min-h-screen bg-canvas">
      <Toast message={toast} />

      <div className="sticky top-0 z-30 border-b border-line bg-surface">
        <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-4 px-6 py-[13px]">
          <div className="flex items-center gap-[11px]">
            <Logo size="md" />
            <span className="rounded-md bg-line-3 px-[9px] py-[3px] text-xs font-semibold tracking-[0.02em] text-muted">
              LEADS
            </span>
          </div>
          <div className="flex items-center gap-3.5">
            <div className="flex items-center gap-[9px]">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-accent-soft font-serif text-sm font-semibold text-accent-soft-ink">
                {nameInitials(session?.user?.name)}
              </span>
              <span className="hidden text-sm font-semibold text-ink-2 sm:inline">
                {session?.user?.name ?? "Attorney"}
              </span>
            </div>
            <button
              onClick={handleSignOut}
              className="inline-flex h-9 items-center gap-[7px] rounded-[9px] border border-line-2 bg-white px-[13px] text-[13.5px] font-semibold text-ink-2 transition-colors hover:border-[#c2b9a9] hover:bg-canvas"
            >
              <SignOut className="text-ink-2" />
              Sign out
            </button>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-[1180px] px-6 pb-[70px] pt-8">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-[18px]">
          <div>
            <h1 className="m-0 mb-1.5 font-serif text-[clamp(28px,3.4vw,36px)] font-medium tracking-[-0.02em]">
              Leads
            </h1>
            <p className="m-0 text-[14.5px] text-muted">
              {leads.length} applications · {pendingCount} awaiting outreach
            </p>
          </div>
          <div role="tablist" aria-label="Filter leads by status" className="inline-flex gap-0.5 rounded-[11px] bg-line-3 p-1">
            <FilterTab label="All" count={leads.length} active={filter === "ALL"} onClick={() => setFilter("ALL")} />
            <FilterTab label="Pending" count={pendingCount} active={filter === "PENDING"} onClick={() => setFilter("PENDING")} />
            <FilterTab label="Reached out" count={reachedCount} active={filter === "REACHED_OUT"} onClick={() => setFilter("REACHED_OUT")} />
          </div>
        </div>

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="relative max-w-[320px] flex-1">
            <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-2" width="16" height="16" viewBox="0 0 18 18" fill="none" aria-hidden>
              <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.5" />
              <path d="M12.5 12.5L16 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or email…"
              aria-label="Search leads"
              className="h-10 w-full rounded-[10px] border border-line-2 bg-surface pl-9 pr-3 text-sm text-ink outline-none transition-[border-color,box-shadow] focus:border-accent focus:shadow-[0_0_0_3px_var(--color-accent-soft)]"
            />
          </div>
          <button
            onClick={() => exportLeadsCsv(rows)}
            disabled={rows.length === 0}
            className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-line-2 bg-surface px-3.5 text-[13.5px] font-semibold text-ink-2 transition-colors hover:border-accent hover:bg-accent-soft disabled:opacity-50"
          >
            <Download className="text-ink-2" />
            Export CSV
          </button>
        </div>

        <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_1px_2px_rgba(28,24,20,0.04),0_18px_40px_-30px_rgba(28,24,20,0.2)]">
          {loading ? (
            <Skeleton />
          ) : rows.length === 0 ? (
            <Empty filter={filter} hasLeads={leads.length > 0} hasQuery={query.trim().length > 0} />
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[1000px]">
                <div className="grid grid-cols-[1.9fr_2fr_1.2fr_1.1fr_2.5fr] gap-4 border-b border-line bg-surface-2 px-[22px] py-[11px] text-[11.5px] font-bold uppercase tracking-[0.05em] text-muted-2">
                  <SortHeader label="Applicant" align="center" active={sort.key === "name"} dir={sort.dir} onClick={() => toggleSort("name")} />
                  <div className="flex items-center justify-center">Email</div>
                  <SortHeader label="Status" align="center" active={sort.key === "status"} dir={sort.dir} onClick={() => toggleSort("status")} />
                  <SortHeader label="Submitted" align="center" active={sort.key === "submitted"} dir={sort.dir} onClick={() => toggleSort("submitted")} />
                  <div className="text-center">Actions</div>
                </div>
                {rows.map((lead) => (
                  <LeadRow
                    key={lead.id}
                    lead={lead}
                    isDuplicate={duplicateIds.has(lead.id)}
                    onOpen={() => router.push(`/dashboard/${lead.id}`)}
                    onSetReached={(reached) => onSetReached(lead.id, reached)}
                    onDownload={() => onDownload(lead)}
                    onDelete={() => onDelete(lead.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function FilterTab({ label, count, active, onClick }: { label: string; count: number; active: boolean; onClick: () => void }) {
  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`inline-flex items-center gap-[7px] rounded-lg px-3.5 py-[7px] text-[13.5px] font-semibold transition-colors ${
        active ? "bg-surface text-ink shadow-[0_1px_2px_rgba(28,24,20,0.08)]" : "text-muted"
      }`}
    >
      {label} <span className="font-semibold opacity-60">{count}</span>
    </button>
  );
}

function SortHeader({
  label,
  active,
  dir,
  onClick,
  align = "left",
}: {
  label: string;
  active: boolean;
  dir: "asc" | "desc";
  onClick: () => void;
  align?: "left" | "center";
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1 uppercase tracking-[0.05em] transition-colors hover:text-ink-2 ${align === "center" ? "justify-center" : "text-left"} ${active ? "text-ink-2" : ""}`}
      aria-label={`Sort by ${label}`}
    >
      {label}
      <span className={`text-[9px] leading-none ${active ? "opacity-100" : "opacity-25"}`}>
        {active && dir === "asc" ? "▲" : "▼"}
      </span>
    </button>
  );
}

function LeadRow({
  lead,
  isDuplicate,
  onOpen,
  onSetReached,
  onDownload,
  onDelete,
}: {
  lead: Lead;
  isDuplicate: boolean;
  onOpen: () => void;
  onSetReached: (reached: boolean) => void;
  onDownload: () => void;
  onDelete: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const reached = lead.state === "REACHED_OUT";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      className="grid cursor-pointer grid-cols-[1.9fr_2fr_1.2fr_1.1fr_2.5fr] items-center gap-4 border-b border-line-3 px-[22px] py-[15px] transition-colors hover:bg-surface-2"
    >
      {/* Fixed-width block centered in the column, so the avatars line up in a clean column
          (centering the avatar+name directly staggers them by name length). */}
      <div className="flex justify-center">
        <div className="flex w-[176px] min-w-0 items-center gap-3">
          <span className="inline-flex h-[34px] w-[34px] flex-none items-center justify-center rounded-full bg-accent-soft font-serif text-[13.5px] font-semibold text-accent-soft-ink">
            {initials(lead)}
          </span>
          <div className="min-w-0">
            <div className="truncate text-[15px] font-semibold text-ink">{fullName(lead)}</div>
            {isDuplicate && (
              <div className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-semibold text-pending-ink">
                <span className="h-1 w-1 rounded-full bg-pending-dot" />
                Re-application
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="truncate text-center text-sm text-body-2">{lead.email}</div>
      <div className="flex justify-center">
        <StatusBadge state={lead.state} />
      </div>
      <div className="text-center text-sm text-body-2">{fmtDate(lead.created_at)}</div>
      <div className="flex items-center justify-center gap-[7px]">
        {confirming ? (
          // Inline confirm — no native dialog. Soft delete, so the copy stays calm.
          <>
            <span className="text-[13px] font-medium text-muted">Delete?</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setConfirming(false);
                onDelete();
              }}
              className="h-8 rounded-lg bg-error-ink-2 px-3 text-[13px] font-semibold text-white transition-colors hover:bg-error-ink"
            >
              Delete
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setConfirming(false);
              }}
              className="h-8 rounded-lg border border-line-2 bg-white px-3 text-[13px] font-semibold text-ink-2 transition-colors hover:bg-canvas"
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            {/* Fixed-width status toggle so the icon cluster keeps a constant width and the
                download/delete/chevron line up across every row. */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSetReached(!reached);
              }}
              className="inline-flex h-8 w-[140px] items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-line-2 bg-white px-2 text-[13px] font-semibold text-ink transition-colors hover:border-accent hover:bg-accent-soft"
            >
              {reached && <Undo className="text-ink-2" />}
              {reached ? "Mark pending" : "Mark reached out"}
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDownload();
              }}
              aria-label="Download resume"
              title="Download resume"
              className="flex h-8 w-8 flex-none items-center justify-center rounded-lg border border-line-2 bg-white text-ink-2 transition-colors hover:border-accent hover:bg-accent-soft"
            >
              <Download />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setConfirming(true);
              }}
              aria-label="Delete lead"
              title="Delete lead"
              className="flex h-8 w-8 flex-none items-center justify-center rounded-lg border border-line-2 bg-white text-ink-2 transition-colors hover:border-error-line hover:bg-error-bg hover:text-error-ink-2"
            >
              <Trash />
            </button>
            <ChevronRight className="flex-none text-ink opacity-40" />
          </>
        )}
      </div>
    </div>
  );
}

function Skeleton() {
  return (
    <div aria-busy="true" aria-live="polite">
      <div className="border-b border-line-3 bg-surface-2 px-[22px] py-4 text-xs font-bold uppercase tracking-[0.04em] text-muted-2">
        Loading leads…
      </div>
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="flex items-center gap-4 border-b border-line-3 px-[22px] py-[17px]">
          <div className="h-[34px] w-[34px] flex-none rounded-full bg-[#ece5d8]" />
          <div className="h-[13px] max-w-[160px] flex-[2] rounded-md bg-[#ece5d8]" />
          <div className="h-[13px] max-w-[200px] flex-[2] rounded-md bg-line-3" />
          <div className="h-6 max-w-[90px] flex-1 rounded-full bg-[#ece5d8]" />
          <div className="h-[13px] max-w-[90px] flex-1 rounded-md bg-line-3" />
        </div>
      ))}
    </div>
  );
}

function Empty({ filter, hasLeads, hasQuery }: { filter: Filter; hasLeads: boolean; hasQuery: boolean }) {
  let title = "No leads yet";
  let body = "New prospect applications will appear here the moment they’re submitted.";
  if (hasQuery) {
    title = "No matches";
    body = "No leads match your search. Try a different name or email.";
  } else if (hasLeads && filter === "PENDING") {
    title = "All caught up";
    body = "Every lead has been reached out to. Nice work — nothing is waiting on you.";
  } else if (hasLeads && filter === "REACHED_OUT") {
    title = "Nothing here yet";
    body = "Leads you’ve marked as reached out will collect here for your records.";
  }
  return (
    <div className="px-7 py-16 text-center">
      <div className="mx-auto mb-[18px] flex h-[60px] w-[60px] items-center justify-center rounded-[15px] bg-line-3">
        <svg width="26" height="26" viewBox="0 0 28 28" fill="none" aria-hidden>
          <rect x="5" y="4" width="18" height="20" rx="2.5" stroke="#a99f8e" strokeWidth="1.5" />
          <path d="M9 10h10M9 14h10M9 18h6" stroke="#a99f8e" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>
      <h3 className="m-0 mb-[7px] font-serif text-[21px] font-medium">{title}</h3>
      <p className="mx-auto m-0 max-w-[26em] text-[14.5px] leading-[1.5] text-muted-2">{body}</p>
    </div>
  );
}
