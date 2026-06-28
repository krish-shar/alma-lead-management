import Link from "next/link";
import { Logo } from "@/components/Logo";
import { ArrowRight, Shield } from "@/components/icons";

const STEPS = [
  {
    title: "Share your details",
    body: "About two minutes. Name, email, and your resume.",
  },
  {
    title: "An attorney reviews your case",
    body: "Not a bot — a licensed immigration attorney.",
  },
  {
    title: "We reach out",
    body: "A confirmation email now, a personal reply within 2 business days.",
  },
];

export default function Home() {
  return (
    <div>
      <header className="mx-auto flex max-w-[1120px] items-center justify-between px-7 py-[26px]">
        <Logo size="lg" />
        <Link
          href="/login"
          className="rounded-lg px-3 py-2 text-[14.5px] font-semibold text-ink-2 transition-colors hover:text-accent"
        >
          Attorney sign-in
        </Link>
      </header>

      <main className="mx-auto flex max-w-[1120px] flex-wrap items-center gap-14 px-7 pb-[70px] pt-[30px]">
        <section className="min-w-[300px] flex-[1_1_440px]">
          <div className="mb-[26px] inline-flex items-center gap-2 rounded-full bg-accent-soft px-[13px] py-1.5 text-[13px] font-semibold text-accent-soft-ink">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            Immigration counsel, made personal
          </div>
          <h1 className="m-0 mb-[22px] text-balance font-serif text-[clamp(40px,5.4vw,62px)] font-medium leading-[1.04] tracking-[-0.02em]">
            Find your footing in a&nbsp;new&nbsp;country.
          </h1>
          <p className="m-0 mb-[34px] max-w-[30em] text-[clamp(16px,1.7vw,19px)] leading-[1.55] text-body">
            Alma pairs you with an immigration attorney who actually reads your story. Share a
            few details and your resume — a real person takes it from there.
          </p>
          <div className="flex flex-wrap items-center gap-[13px]">
            <Link
              href="/apply"
              className="inline-flex h-[52px] items-center gap-[9px] rounded-xl bg-accent px-[26px] text-base font-semibold text-white shadow-[0_1px_2px_rgba(28,24,20,0.2)] transition-[background,transform] duration-150 hover:bg-accent-hover active:translate-y-px"
            >
              Apply as a prospect
              <ArrowRight />
            </Link>
            <Link
              href="/login"
              className="inline-flex h-[52px] items-center rounded-xl border border-line-2 bg-surface px-[22px] text-base font-semibold text-ink transition-colors hover:border-[#c2b9a9] hover:bg-white"
            >
              Attorney sign-in
            </Link>
          </div>
          <p className="m-0 mt-[26px] flex items-center gap-2 text-[13.5px] text-muted">
            <Shield className="text-muted" />
            Encrypted, confidential, and never sold.
          </p>
        </section>

        <aside className="min-w-[290px] flex-[1_1_360px] rounded-[18px] border border-line bg-surface p-[30px] shadow-[0_1px_2px_rgba(28,24,20,0.04),0_22px_44px_-26px_rgba(28,24,20,0.18)]">
          <h2 className="m-0 mb-[22px] font-serif text-[21px] font-medium tracking-[-0.01em]">
            What to expect
          </h2>
          <ol className="m-0 flex list-none flex-col gap-5 p-0">
            {STEPS.map((step, i) => (
              <li key={i} className="flex gap-[15px]">
                <span className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-[9px] bg-accent-soft text-sm font-bold text-accent-soft-ink">
                  {i + 1}
                </span>
                <div>
                  <div className="mb-0.5 text-[15px] font-semibold">{step.title}</div>
                  <div className="text-sm leading-[1.45] text-muted">{step.body}</div>
                </div>
              </li>
            ))}
          </ol>
        </aside>
      </main>

      <footer className="mt-2.5 border-t border-line">
        <div className="mx-auto flex max-w-[1120px] flex-wrap justify-between gap-2.5 px-7 py-[22px] text-[13px] text-muted-2">
          <span>© 2026 Alma Immigration Law, PLLC</span>
          <span>Privacy · Attorney advertising · Not legal advice until engaged</span>
        </div>
      </footer>
    </div>
  );
}
