"use client";

import Link from "next/link";
import { useState } from "react";
import { Logo } from "@/components/Logo";
import { AlertCircle, ChevronLeft, FileDoc, Shield } from "@/components/icons";
import { readErrorDetail, submitLead } from "@/lib/api";
import {
  type ApplyErrors,
  type ApplyForm,
  computeApplyErrors,
  validateResumeFile,
} from "@/lib/validation";


type Status = "idle" | "submitting" | "success" | "error";

function formatSize(bytes: number): string {
  return bytes >= 1048576
    ? `${(bytes / 1048576).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

const inputClass =
  "h-12 w-full rounded-[11px] border border-line-2 bg-white px-[14px] text-[15px] text-ink transition-[border-color,box-shadow] outline-none focus:border-accent focus:shadow-[0_0_0_3px_var(--color-accent-soft)]";
const labelClass = "mb-[7px] block text-[13.5px] font-semibold text-ink-2";

export default function ApplyPage() {
  const [form, setForm] = useState<ApplyForm>({ firstName: "", lastName: "", email: "" });
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState("");
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [serverError, setServerError] = useState("");
  const [applicantEmail, setApplicantEmail] = useState("");

  const errors = computeApplyErrors(form, file);
  const show = (f: keyof ApplyErrors) => Boolean(touched[f] || submitAttempted);
  const set = (k: keyof ApplyForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((s) => ({ ...s, [k]: e.target.value }));
  const blur = (k: string) => () => setTouched((s) => ({ ...s, [k]: true }));

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const err = validateResumeFile(f);
    if (err) {
      setFile(null);
      setFileError(err);
      return;
    }
    setFile(f);
    setFileError("");
  }

  function removeFile() {
    setFile(null);
    setFileError("");
    const el = document.getElementById("resume") as HTMLInputElement | null;
    if (el) el.value = "";
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitAttempted(true);
    const errs = computeApplyErrors(form, file);
    if (!file && errs.file) setFileError(errs.file);
    if (Object.keys(errs).length) return;

    setStatus("submitting");
    setServerError("");
    try {
      const fd = new FormData();
      fd.append("first_name", form.firstName.trim());
      fd.append("last_name", form.lastName.trim());
      fd.append("email", form.email.trim());
      fd.append("resume", file as File);
      const res = await submitLead(fd);
      if (res.status === 201) {
        setApplicantEmail(form.email.trim());
        setStatus("success");
      } else {
        setStatus("error");
        setServerError(await readErrorDetail(res));
      }
    } catch {
      setStatus("error");
      setServerError("Could not reach the server. Please try again.");
    }
  }

  const isSubmitting = status === "submitting";

  return (
    <div>
      <header className="mx-auto flex max-w-[680px] items-center justify-between px-6 pt-6">
        <Link
          href="/"
          className="inline-flex items-center gap-[7px] px-1 py-2 text-sm font-semibold text-muted transition-colors hover:text-ink"
        >
          <ChevronLeft />
          Back
        </Link>
        <Logo size="sm" className="opacity-85" />
      </header>

      <main className="mx-auto max-w-[680px] px-6 pb-20 pt-[30px]">
        {status === "success" ? (
          <div className="anim-rise py-9 text-center">
            <div className="anim-pop mx-auto mb-7 flex h-[84px] w-[84px] items-center justify-center rounded-full bg-accent-soft">
              <svg width="40" height="40" viewBox="0 0 44 44" fill="none" aria-hidden>
                <path
                  d="M12 22.5l6.5 6.5L33 14"
                  stroke="var(--color-accent)"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray="40"
                  strokeDashoffset="40"
                  className="anim-draw"
                />
              </svg>
            </div>
            <h1 className="m-0 mb-3.5 font-serif text-[clamp(30px,4.4vw,40px)] font-medium tracking-[-0.02em]">
              Application received
            </h1>
            <p className="mx-auto mb-2 max-w-[30em] text-[17px] leading-[1.55] text-body">
              We&apos;ve sent a confirmation to{" "}
              <strong className="font-semibold text-ink">{applicantEmail}</strong>. An immigration
              attorney will review your information and personally reach out within{" "}
              <strong className="font-semibold text-ink">2 business days</strong>.
            </p>
            <p className="mx-auto mb-8 text-[15px] text-muted">
              There&apos;s nothing else you need to do right now.
            </p>
            <Link
              href="/"
              className="inline-flex h-12 items-center rounded-xl bg-accent px-6 text-[15px] font-semibold text-white transition-colors hover:bg-accent-hover"
            >
              Back to home
            </Link>
          </div>
        ) : (
          <div>
            <h1 className="m-0 mb-3 font-serif text-[clamp(32px,4.6vw,44px)] font-medium tracking-[-0.02em]">
              Tell us about yourself
            </h1>
            <p className="m-0 mb-8 max-w-[34em] text-[16.5px] leading-[1.55] text-body">
              A few details and your resume — about two minutes. Everything you share stays
              confidential.
            </p>

            {status === "error" && (
              <div
                role="alert"
                className="mb-6 flex items-start gap-3 rounded-xl border border-error-line bg-error-bg px-4 py-3.5"
              >
                <AlertCircle className="mt-px flex-none text-error-ink-2" />
                <div>
                  <div className="mb-0.5 text-[14.5px] font-semibold text-error-ink">
                    We couldn&apos;t submit your application
                  </div>
                  <div className="text-sm leading-[1.45] text-error-ink">{serverError}</div>
                </div>
              </div>
            )}

            <form
              onSubmit={onSubmit}
              noValidate
              className="rounded-[18px] border border-line bg-surface p-[clamp(20px,3vw,32px)] shadow-[0_1px_2px_rgba(28,24,20,0.04),0_22px_44px_-28px_rgba(28,24,20,0.16)]"
            >
              <div className="mb-5 flex flex-wrap gap-4">
                <div className="min-w-[150px] flex-[1_1_180px]">
                  <label htmlFor="firstName" className={labelClass}>
                    First name
                  </label>
                  <input
                    id="firstName"
                    type="text"
                    autoComplete="given-name"
                    value={form.firstName}
                    onChange={set("firstName")}
                    onBlur={blur("firstName")}
                    aria-invalid={show("firstName") && Boolean(errors.firstName)}
                    className={inputClass}
                  />
                  {show("firstName") && errors.firstName && (
                    <div className="mt-1.5 text-[13px] text-error-ink-2">{errors.firstName}</div>
                  )}
                </div>
                <div className="min-w-[150px] flex-[1_1_180px]">
                  <label htmlFor="lastName" className={labelClass}>
                    Last name
                  </label>
                  <input
                    id="lastName"
                    type="text"
                    autoComplete="family-name"
                    value={form.lastName}
                    onChange={set("lastName")}
                    onBlur={blur("lastName")}
                    aria-invalid={show("lastName") && Boolean(errors.lastName)}
                    className={inputClass}
                  />
                  {show("lastName") && errors.lastName && (
                    <div className="mt-1.5 text-[13px] text-error-ink-2">{errors.lastName}</div>
                  )}
                </div>
              </div>

              <div className="mb-5">
                <label htmlFor="email" className={labelClass}>
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={set("email")}
                  onBlur={blur("email")}
                  aria-invalid={show("email") && Boolean(errors.email)}
                  aria-describedby="email-help"
                  className={inputClass}
                />
                {show("email") && errors.email ? (
                  <div className="mt-1.5 text-[13px] text-error-ink-2">{errors.email}</div>
                ) : (
                  <div id="email-help" className="mt-1.5 text-[13px] text-muted-2">
                    We&apos;ll send your confirmation here.
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="resume" className={labelClass}>
                  Resume / CV
                </label>
                <input
                  id="resume"
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={onFile}
                  aria-describedby="resume-help"
                  className="sr-only"
                />
                {!file ? (
                  <label
                    htmlFor="resume"
                    className="flex cursor-pointer flex-col items-center justify-center gap-[9px] rounded-[13px] border-[1.5px] border-dashed border-[#cdc4b4] bg-white p-[26px] text-center transition-[border-color,background] hover:border-accent hover:bg-accent-soft"
                  >
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-[11px] bg-accent-soft">
                      <svg width="20" height="20" viewBox="0 0 22 22" fill="none" aria-hidden>
                        <path d="M11 15V5m0 0L7 9m4-4l4 4" stroke="var(--color-accent)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M4 14.5V17a1.5 1.5 0 001.5 1.5h11A1.5 1.5 0 0018 17v-2.5" stroke="var(--color-accent)" strokeWidth="1.7" strokeLinecap="round" />
                      </svg>
                    </span>
                    <span className="text-[15px] font-semibold text-ink">
                      <span className="text-accent">Click to upload</span> your resume
                    </span>
                    <span id="resume-help" className="text-[13px] text-muted-2">
                      PDF, DOC, or DOCX · up to 4&nbsp;MB
                    </span>
                  </label>
                ) : (
                  <div className="flex items-center gap-[13px] rounded-[13px] border border-line-2 bg-white px-4 py-3.5">
                    <span className="inline-flex h-10 w-10 flex-none items-center justify-center rounded-[10px] bg-accent-soft text-accent">
                      <FileDoc size={19} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[14.5px] font-semibold text-ink">{file.name}</div>
                      <div className="text-[13px] text-muted-2">{formatSize(file.size)} · ready to submit</div>
                    </div>
                    <button
                      type="button"
                      onClick={removeFile}
                      aria-label="Remove file"
                      className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-[9px] border border-line-4 bg-surface transition-colors hover:border-error-line hover:bg-error-bg"
                    >
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
                        <path d="M4 4l8 8M12 4l-8 8" stroke="#8c5a4a" strokeWidth="1.6" strokeLinecap="round" />
                      </svg>
                    </button>
                  </div>
                )}
                {fileError && <div className="mt-2 text-[13px] text-error-ink-2">{fileError}</div>}
              </div>

              <div className="mt-7 flex flex-wrap items-center gap-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex h-[50px] min-w-[200px] items-center justify-center gap-2.5 rounded-xl bg-accent px-[26px] text-[15.5px] font-semibold text-white transition-[background,opacity] hover:bg-accent-hover disabled:opacity-70"
                >
                  {isSubmitting ? (
                    <>
                      <span className="anim-spin h-[17px] w-[17px] rounded-full border-2 border-white/40 border-t-white" />
                      Submitting…
                    </>
                  ) : (
                    "Submit application"
                  )}
                </button>
                <span className="flex items-center gap-[7px] text-[13px] text-muted-2">
                  <Shield size={13} className="text-muted-2" />
                  Confidential &amp; encrypted
                </span>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
