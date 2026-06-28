"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/components/Logo";
import { AlertCircle } from "@/components/icons";
import { signIn } from "@/lib/auth-client";

const inputClass =
  "h-12 w-full rounded-[11px] border border-line-2 bg-white px-[14px] text-[15px] text-ink transition-[border-color,box-shadow] outline-none focus:border-accent focus:shadow-[0_0_0_3px_var(--color-accent-soft)]";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }
    setLoading(true);
    setError("");
    const { error: signInError } = await signIn.email({ email: email.trim(), password });
    if (signInError) {
      setLoading(false);
      setError("Email or password is incorrect.");
    } else {
      router.push("/dashboard");
    }
  }

  return (
    <div className="flex min-h-screen flex-wrap">
      <div className="flex min-h-[240px] flex-[1_1_380px] flex-col justify-between bg-accent p-[clamp(28px,5vw,56px)] text-[#eaf1ec]">
        <Link href="/" className="w-fit">
          <Logo size="lg" variant="onAccent" />
        </Link>
        <div className="max-w-[24em]">
          <h1 className="m-0 mb-3.5 font-serif text-[clamp(28px,3.4vw,38px)] font-medium leading-[1.1] tracking-[-0.02em]">
            Secure access for Alma attorneys &amp; staff.
          </h1>
          <p className="m-0 text-[15px] leading-[1.55] text-[rgba(234,241,236,0.78)]">
            Review new prospect leads, manage outreach, and pick up exactly where you left off.
          </p>
        </div>
        <div className="flex items-center gap-2 text-[13px] text-[rgba(234,241,236,0.62)]">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
            <rect x="3" y="7" width="10" height="7" rx="1.5" stroke="rgba(234,241,236,.7)" strokeWidth="1.3" />
            <path d="M5.5 7V5a2.5 2.5 0 015 0v2" stroke="rgba(234,241,236,.7)" strokeWidth="1.3" />
          </svg>
          Authorized personnel only
        </div>
      </div>

      <div className="flex flex-[1_1_420px] items-center justify-center bg-canvas p-[clamp(28px,5vw,56px)]">
        <div className="w-full max-w-[380px]">
          <h2 className="m-0 mb-1.5 font-serif text-[30px] font-medium tracking-[-0.01em]">Sign in</h2>
          <p className="m-0 mb-7 text-[15px] text-muted">Welcome back. Enter your firm credentials.</p>

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
              <label htmlFor="loginEmail" className="mb-[7px] block text-[13.5px] font-semibold text-ink-2">
                Email
              </label>
              <input
                id="loginEmail"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="mb-[22px]">
              <div className="mb-[7px] flex items-baseline justify-between">
                <label htmlFor="loginPassword" className="text-[13.5px] font-semibold text-ink-2">
                  Password
                </label>
                <button type="button" className="p-0 text-[13px] font-semibold text-accent">
                  Forgot password?
                </button>
              </div>
              <input
                id="loginPassword"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
                  Signing in…
                </>
              ) : (
                "Sign in"
              )}
            </button>
          </form>

          <div className="mt-[22px] rounded-[10px] border border-dashed border-line-2 px-3.5 py-[11px] text-[12.5px] leading-[1.5] text-muted-2">
            <strong className="font-semibold text-muted">Demo</strong> — sign in with{" "}
            <span className="font-semibold text-ink-2">maya.okafor@alma.law</span> /{" "}
            <span className="font-semibold text-ink-2">almademo2026</span>.
          </div>
        </div>
      </div>
    </div>
  );
}
