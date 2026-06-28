"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { StatusBadge } from "@/components/StatusBadge";
import { Toast, useToast } from "@/components/Toast";
import { CheckSmall, ChevronLeft, Download, FileDoc } from "@/components/icons";
import { fmtDateTime, fullName, initials, type Lead } from "@/lib/api";
import { signOut } from "@/lib/auth-client";
import { downloadResume, getLead, markReachedOut, UnauthorizedError } from "@/lib/leads-client";

export default function LeadDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { toast, showToast } = useToast();

  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let active = true;
    getLead(id)
      .then((l) => active && setLead(l))
      .catch((err) => {
        if (err instanceof UnauthorizedError) router.replace("/login");
        else if (active) setNotFound(true);
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [id, router]);

  async function onMarkReached() {
    if (!lead) return;
    try {
      const updated = await markReachedOut(lead.id);
      setLead(updated);
      showToast("Marked as reached out.");
    } catch {
      showToast("Couldn’t update that lead — please retry.");
    }
  }

  async function onDownload() {
    if (!lead) return;
    showToast(`Preparing ${lead.resume_filename}…`, 2200);
    try {
      await downloadResume(lead.id);
    } catch {
      showToast("Couldn’t prepare that download.");
    }
  }

  async function handleSignOut() {
    await signOut();
    router.push("/login");
  }

  return (
    <div className="min-h-screen bg-canvas">
      <Toast message={toast} />

      <div className="sticky top-0 z-30 border-b border-line bg-surface">
        <div className="mx-auto flex max-w-[1000px] items-center justify-between gap-4 px-6 py-[13px]">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-1 py-1.5 text-sm font-semibold text-muted transition-colors hover:text-ink"
          >
            <ChevronLeft />
            All leads
          </Link>
          <button
            onClick={handleSignOut}
            className="inline-flex h-[34px] items-center gap-[7px] rounded-[9px] border border-line-2 bg-white px-[13px] text-[13.5px] font-semibold text-ink-2 transition-colors hover:bg-canvas"
          >
            Sign out
          </button>
        </div>
      </div>

      <main className="mx-auto max-w-[1000px] px-6 pb-[70px] pt-[34px]">
        {loading ? (
          <LoadingState />
        ) : notFound || !lead ? (
          <NotFoundState />
        ) : (
          <>
            <div className="mb-[30px] flex flex-wrap items-start justify-between gap-5">
              <div className="flex min-w-0 items-center gap-[18px]">
                <span className="inline-flex h-[60px] w-[60px] flex-none items-center justify-center rounded-2xl bg-accent-soft font-serif text-2xl font-semibold text-accent-soft-ink">
                  {initials(lead)}
                </span>
                <div className="min-w-0">
                  <h1 className="m-0 mb-1.5 font-serif text-[clamp(28px,3.6vw,38px)] font-medium leading-[1.05] tracking-[-0.02em]">
                    {fullName(lead)}
                  </h1>
                  <StatusBadge state={lead.state} size="md" pendingLabel="Pending outreach" />
                </div>
              </div>
              {lead.state === "PENDING" && (
                <button
                  onClick={onMarkReached}
                  className="inline-flex h-[46px] items-center gap-[9px] rounded-[11px] bg-accent px-5 text-[14.5px] font-semibold text-white transition-colors hover:bg-accent-hover"
                >
                  <CheckSmall className="text-white" />
                  Mark reached out
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-start gap-[22px]">
              <div className="flex min-w-[280px] flex-[2_1_380px] flex-col gap-[18px]">
                <section className="rounded-2xl border border-line bg-surface p-6 shadow-[0_1px_2px_rgba(28,24,20,0.04)]">
                  <h2 className="m-0 mb-4 text-xs font-bold uppercase tracking-[0.05em] text-muted-2">
                    Contact
                  </h2>
                  <dl className="m-0 flex flex-col gap-[15px]">
                    <Field label="First name" value={lead.first_name} />
                    <Field label="Last name" value={lead.last_name} />
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                      <dt className="flex-[0_0_130px] text-sm text-muted-2">Email</dt>
                      <dd className="m-0 text-[15px] font-medium">
                        <a
                          href={`mailto:${lead.email}`}
                          className="border-b border-accent-soft text-accent no-underline"
                        >
                          {lead.email}
                        </a>
                      </dd>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                      <dt className="flex-[0_0_130px] text-sm text-muted-2">Lead ID</dt>
                      <dd className="m-0 font-mono text-[13px] font-medium text-muted-2">{lead.id}</dd>
                    </div>
                  </dl>
                </section>

                <section className="rounded-2xl border border-line bg-surface p-6 shadow-[0_1px_2px_rgba(28,24,20,0.04)]">
                  <h2 className="m-0 mb-4 text-xs font-bold uppercase tracking-[0.05em] text-muted-2">
                    Resume / CV
                  </h2>
                  <div className="flex items-center gap-3.5">
                    <span className="inline-flex h-11 w-11 flex-none items-center justify-center rounded-[11px] bg-accent-soft text-accent">
                      <FileDoc />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[15px] font-semibold">{lead.resume_filename}</div>
                      <div className="text-[13px] text-muted-2">Attached with application</div>
                    </div>
                    <button
                      onClick={onDownload}
                      className="inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-[10px] border border-line-2 bg-white px-4 text-sm font-semibold text-ink transition-colors hover:border-accent hover:bg-accent-soft"
                    >
                      <Download className="text-ink-2" />
                      Download
                    </button>
                  </div>
                </section>
              </div>

              <aside className="min-w-[240px] flex-[1_1_260px] rounded-2xl border border-line bg-surface p-6 shadow-[0_1px_2px_rgba(28,24,20,0.04)]">
                <h2 className="m-0 mb-5 text-xs font-bold uppercase tracking-[0.05em] text-muted-2">
                  Timeline
                </h2>
                <ol className="m-0 flex list-none flex-col p-0">
                  <TimelineItem
                    title="Application submitted"
                    when={fmtDateTime(lead.created_at)}
                    dot="bg-accent"
                    line
                  />
                  <TimelineItem
                    title="Last updated"
                    when={fmtDateTime(lead.updated_at)}
                    dot="bg-line-2"
                    line
                  />
                  <TimelineItem
                    title="Reached out"
                    when={fmtDateTime(lead.reached_out_at)}
                    dot={lead.state === "REACHED_OUT" ? "bg-reached-dot" : "dashed"}
                  />
                </ol>
              </aside>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1">
      <dt className="flex-[0_0_130px] text-sm text-muted-2">{label}</dt>
      <dd className="m-0 text-[15px] font-medium text-ink">{value}</dd>
    </div>
  );
}

function TimelineItem({
  title,
  when,
  dot,
  line = false,
}: {
  title: string;
  when: string;
  dot: string;
  line?: boolean;
}) {
  return (
    <li className={`relative flex gap-[13px] ${line ? "pb-[18px]" : ""}`}>
      {dot === "dashed" ? (
        <span className="mt-[3px] h-[11px] w-[11px] flex-none rounded-full border-[1.5px] border-dashed border-line-2 bg-white" />
      ) : (
        <span className={`mt-[3px] h-[11px] w-[11px] flex-none rounded-full ${dot} z-[1]`} />
      )}
      {line && <span className="absolute bottom-[-4px] left-[5px] top-[14px] w-[1.5px] bg-line-4" />}
      <div>
        <div className="text-sm font-semibold text-ink">{title}</div>
        <div className="mt-0.5 text-[13px] text-muted-2">{when}</div>
      </div>
    </li>
  );
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-24 text-muted-2">
      <span className="anim-spin h-6 w-6 rounded-full border-2 border-line-2 border-t-accent" />
    </div>
  );
}

function NotFoundState() {
  return (
    <div className="py-20 text-center">
      <h1 className="m-0 mb-2 font-serif text-[28px] font-medium">Lead not found</h1>
      <p className="m-0 mb-6 text-[15px] text-muted-2">
        This lead may have been removed, or the link is incorrect.
      </p>
      <Link
        href="/dashboard"
        className="inline-flex h-11 items-center rounded-xl bg-accent px-5 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
      >
        Back to all leads
      </Link>
    </div>
  );
}
