"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Logo } from "@/components/Logo";
import { StatusBadge } from "@/components/StatusBadge";
import { Toast, useToast } from "@/components/Toast";
import { ChevronRight, Download, SignOut } from "@/components/icons";
import { fmtDate, fullName, initials, type Lead, type LeadState } from "@/lib/api";
import { signOut, useSession } from "@/lib/auth-client";
import { downloadResume, fetchLeads, markReachedOut, UnauthorizedError } from "@/lib/leads-client";

type Filter = "ALL" | "PENDING" | "REACHED_OUT";

const EMPTY_COPY: Record<string, { title: string; body: string }> = {
  none: {
    title: "No leads yet",
    body: "New prospect applications will appear here the moment they’re submitted.",
  },
  PENDING: {
    title: "All caught up",
    body: "Every lead has been reached out to. Nice work — nothing is waiting on you.",
  },
  REACHED_OUT: {
    title: "Nothing here yet",
    body: "Leads you’ve marked as reached out will collect here for your records.",
  },
};

function nameInitials(name?: string | null): string {
  if (!name) return "··";
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function DashboardPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const { toast, showToast } = useToast();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("ALL");

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
  const rows = useMemo(
    () => (filter === "ALL" ? leads : leads.filter((l) => l.state === filter)),
    [leads, filter],
  );

  const onMarkReached = useCallback(
    async (id: string) => {
      try {
        const updated = await markReachedOut(id);
        setLeads((prev) => prev.map((l) => (l.id === id ? updated : l)));
        showToast("Marked as reached out.");
      } catch {
        showToast("Couldn’t update that lead — please retry.");
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
              <span className="text-sm font-semibold text-ink-2">{session?.user?.name ?? "Attorney"}</span>
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
        <div className="mb-6 flex flex-wrap items-end justify-between gap-[18px]">
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

        <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_1px_2px_rgba(28,24,20,0.04),0_18px_40px_-30px_rgba(28,24,20,0.2)]">
          {loading ? (
            <Skeleton />
          ) : rows.length === 0 ? (
            <Empty filter={filter} hasLeads={leads.length > 0} />
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[720px]">
                <div className="grid grid-cols-[2.2fr_2.4fr_1.3fr_1.2fr_1.6fr] gap-4 border-b border-line bg-surface-2 px-[22px] py-[13px] text-[11.5px] font-bold uppercase tracking-[0.05em] text-muted-2">
                  <div>Applicant</div>
                  <div>Email</div>
                  <div>Status</div>
                  <div>Submitted</div>
                  <div className="text-right">Actions</div>
                </div>
                {rows.map((lead) => (
                  <LeadRow
                    key={lead.id}
                    lead={lead}
                    onOpen={() => router.push(`/dashboard/${lead.id}`)}
                    onMarkReached={() => onMarkReached(lead.id)}
                    onDownload={() => onDownload(lead)}
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

function FilterTab({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
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

function LeadRow({
  lead,
  onOpen,
  onMarkReached,
  onDownload,
}: {
  lead: Lead;
  onOpen: () => void;
  onMarkReached: () => void;
  onDownload: () => void;
}) {
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
      className="grid cursor-pointer grid-cols-[2.2fr_2.4fr_1.3fr_1.2fr_1.6fr] items-center gap-4 border-b border-line-3 px-[22px] py-[15px] transition-colors hover:bg-surface-2"
    >
      <div className="flex min-w-0 items-center gap-3">
        <span className="inline-flex h-[34px] w-[34px] flex-none items-center justify-center rounded-full bg-accent-soft font-serif text-[13.5px] font-semibold text-accent-soft-ink">
          {initials(lead)}
        </span>
        <span className="truncate text-[15px] font-semibold text-ink">{fullName(lead)}</span>
      </div>
      <div className="truncate text-sm text-body-2">{lead.email}</div>
      <div>
        <StatusBadge state={lead.state} />
      </div>
      <div className="text-sm text-body-2">{fmtDate(lead.created_at)}</div>
      <div className="flex items-center justify-end gap-[7px]">
        {lead.state === "PENDING" && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onMarkReached();
            }}
            className="h-8 whitespace-nowrap rounded-lg border border-line-2 bg-white px-3 text-[13px] font-semibold text-ink transition-colors hover:border-accent hover:bg-accent-soft"
          >
            Mark reached out
          </button>
        )}
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
        <ChevronRight className="flex-none text-ink opacity-40" />
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

function Empty({ filter, hasLeads }: { filter: Filter; hasLeads: boolean }) {
  const copy = hasLeads && filter !== "ALL" ? EMPTY_COPY[filter] : EMPTY_COPY.none;
  return (
    <div className="px-7 py-16 text-center">
      <div className="mx-auto mb-[18px] flex h-[60px] w-[60px] items-center justify-center rounded-[15px] bg-line-3">
        <svg width="26" height="26" viewBox="0 0 28 28" fill="none" aria-hidden>
          <rect x="5" y="4" width="18" height="20" rx="2.5" stroke="#a99f8e" strokeWidth="1.5" />
          <path d="M9 10h10M9 14h10M9 18h6" stroke="#a99f8e" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>
      <h3 className="m-0 mb-[7px] font-serif text-[21px] font-medium">{copy.title}</h3>
      <p className="mx-auto m-0 max-w-[26em] text-[14.5px] leading-[1.5] text-muted-2">{copy.body}</p>
    </div>
  );
}
