"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ALLOWED_RESUME_EXTENSIONS,
  MAX_RESUME_BYTES,
  readErrorDetail,
  submitLead,
} from "@/lib/api";

type Status = "idle" | "submitting" | "success" | "error";

function validate(form: HTMLFormElement): string | null {
  const data = new FormData(form);
  const first = (data.get("first_name") as string)?.trim();
  const last = (data.get("last_name") as string)?.trim();
  const email = (data.get("email") as string)?.trim();
  const resume = data.get("resume") as File | null;

  if (!first || !last) return "Please enter your first and last name.";
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return "Please enter a valid email address.";
  if (!resume || resume.size === 0) return "Please attach your resume.";
  const ext = resume.name.slice(resume.name.lastIndexOf(".")).toLowerCase();
  if (!ALLOWED_RESUME_EXTENSIONS.includes(ext))
    return "Resume must be a PDF, DOC, or DOCX file.";
  if (resume.size > MAX_RESUME_BYTES) return "Resume must be 4 MB or smaller.";
  return null;
}

export default function ApplyPage() {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string>("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;

    const clientError = validate(form);
    if (clientError) {
      setStatus("error");
      setError(clientError);
      return;
    }

    setStatus("submitting");
    setError("");
    try {
      const res = await submitLead(new FormData(form));
      if (res.status === 201) {
        setStatus("success");
        form.reset();
      } else {
        setStatus("error");
        setError(await readErrorDetail(res));
      }
    } catch {
      setStatus("error");
      setError("Could not reach the server. Please try again.");
    }
  }

  if (status === "success") {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center">
          <h1 className="text-2xl font-bold text-emerald-800">Application received 🎉</h1>
          <p className="mt-3 text-emerald-700">
            Thanks for applying. We&apos;ve emailed you a confirmation, and an attorney will
            reach out soon.
          </p>
          <button
            onClick={() => setStatus("idle")}
            className="mt-6 text-sm font-medium text-emerald-700 underline"
          >
            Submit another application
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <Link href="/" className="mb-6 text-sm text-slate-500 hover:text-slate-700">
        ← Back
      </Link>
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">Apply</h1>
      <p className="mt-2 text-slate-600">
        Tell us about yourself and attach your resume.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5" noValidate>
        <div className="grid grid-cols-2 gap-4">
          <Field label="First name" name="first_name" autoComplete="given-name" />
          <Field label="Last name" name="last_name" autoComplete="family-name" />
        </div>
        <Field label="Email" name="email" type="email" autoComplete="email" />

        <div>
          <label htmlFor="resume" className="block text-sm font-medium text-slate-700">
            Resume / CV <span className="text-slate-400">(PDF, DOC, DOCX · ≤ 4 MB)</span>
          </label>
          <input
            id="resume"
            name="resume"
            type="file"
            accept=".pdf,.doc,.docx"
            required
            className="mt-1 block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-indigo-700 hover:file:bg-indigo-100"
          />
        </div>

        {status === "error" && (
          <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={status === "submitting"}
          className="w-full rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
        >
          {status === "submitting" ? "Submitting…" : "Submit application"}
        </button>
      </form>
    </main>
  );
}

function Field({
  label,
  name,
  type = "text",
  autoComplete,
}: {
  label: string;
  name: string;
  type?: string;
  autoComplete?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-slate-700">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        autoComplete={autoComplete}
        required
        className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
      />
    </div>
  );
}
