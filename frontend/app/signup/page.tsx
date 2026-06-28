"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/components/Logo";
import { AlertCircle } from "@/components/icons";

const inputClass =
  "h-12 w-full rounded-[11px] border border-line-2 bg-white px-[14px] text-[15px] text-ink transition-[border-color,box-shadow] outline-none focus:border-accent focus:shadow-[0_0_0_3px_var(--color-accent-soft)]";
const labelClass = "mb-[7px] block text-[13.5px] font-semibold text-ink-2";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      setError("Please enter your name and email.");
      return;
    }
    if (password.length < 10) {
      setError("Password must be at least 10 characters.");
      return;
    }
    if (!code.trim()) {
      setError("A registration code is required to create an account.");
      return;
    }
    setLoading(true);
    setError("");
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        email: email.trim(),
        password,
        code: code.trim(),
      }),
    });
    if (res.ok) {
      router.push("/dashboard"); // the new attorney is signed in
      return;
    }
    setLoading(false);
    if (res.status === 403) {
      setError("That registration code isn’t valid.");
      return;
    }
    let message = "Couldn’t create the account. Please try again.";
    try {
      const data = await res.json();
      if (typeof data?.message === "string") {
        message = data.message.toLowerCase().includes("exist")
          ? "An account with that email already exists."
          : data.message;
      }
    } catch {
      /* keep default */
    }
    setError(message);
  }

  return (
    <div className="flex min-h-screen flex-wrap">
      <div className="flex min-h-[240px] flex-[1_1_380px] flex-col justify-between bg-accent p-[clamp(28px,5vw,56px)] text-[#eaf1ec]">
        <Link href="/" className="w-fit">
          <Logo size="lg" variant="onAccent" />
        </Link>
        <div className="max-w-[24em]">
          <h1 className="m-0 mb-3.5 font-serif text-[clamp(28px,3.4vw,38px)] font-medium leading-[1.1] tracking-[-0.02em]">
            Create your Alma staff account.
          </h1>
          <p className="m-0 text-[15px] leading-[1.55] text-[rgba(234,241,236,0.78)]">
            Attorneys and staff use Alma to review new prospect leads and manage outreach.
          </p>
        </div>
        <div className="flex items-center gap-2 text-[13px] text-[rgba(234,241,236,0.62)]">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
            <rect x="3" y="7" width="10" height="7" rx="1.5" stroke="rgba(234,241,236,.7)" strokeWidth="1.3" />
            <path d="M5.5 7V5a2.5 2.5 0 015 0v2" stroke="rgba(234,241,236,.7)" strokeWidth="1.3" />
          </svg>
          For authorized firm personnel
        </div>
      </div>

      <div className="flex flex-[1_1_420px] items-center justify-center bg-canvas p-[clamp(28px,5vw,56px)]">
        <div className="w-full max-w-[380px]">
          <h2 className="m-0 mb-1.5 font-serif text-[30px] font-medium tracking-[-0.01em]">Create account</h2>
          <p className="m-0 mb-7 text-[15px] text-muted">
            Already have one?{" "}
            <Link href="/login" className="font-semibold text-accent">
              Sign in
            </Link>
            .
          </p>

          {error && (
            <div
              role="alert"
              className="mb-5 flex items-center gap-2.5 rounded-[11px] border border-error-line bg-error-bg px-3.5 py-3 text-sm font-medium text-error-ink"
            >
              <AlertCircle size={17} className="flex-none text-error-ink-2" />
              {error}
            </div>
          )}

          <form onSubmit={onSubmit} noValidate>
            <div className="mb-[18px]">
              <label htmlFor="name" className={labelClass}>
                Full name
              </label>
              <input
                id="name"
                type="text"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="mb-[18px]">
              <label htmlFor="email" className={labelClass}>
                Work email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="mb-[18px]">
              <label htmlFor="password" className={labelClass}>
                Password <span className="font-normal text-muted-2">(at least 10 characters)</span>
              </label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="mb-[22px]">
              <label htmlFor="code" className={labelClass}>
                Registration code
              </label>
              <input
                id="code"
                type="text"
                autoComplete="off"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Provided by your firm admin"
                className={inputClass}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex h-[50px] w-full items-center justify-center gap-2.5 rounded-xl bg-accent text-[15.5px] font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-70"
            >
              {loading ? (
                <>
                  <span className="anim-spin h-[17px] w-[17px] rounded-full border-2 border-white/40 border-t-white" />
                  Creating…
                </>
              ) : (
                "Create account"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
