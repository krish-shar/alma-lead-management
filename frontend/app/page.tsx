import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-10 px-6 py-16">
      <header className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-widest text-indigo-600">
          Alma
        </p>
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
          Lead Management
        </h1>
        <p className="max-w-prose text-lg text-slate-600">
          A public intake form for prospects and a secure internal dashboard for attorneys to
          review and follow up on leads.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/apply"
          className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-indigo-300 hover:shadow-md"
        >
          <h2 className="text-lg font-semibold text-slate-900 group-hover:text-indigo-700">
            Apply as a prospect →
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Submit your name, email, and resume. Our team will reach out.
          </p>
        </Link>

        <Link
          href="/login"
          className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-indigo-300 hover:shadow-md"
        >
          <h2 className="text-lg font-semibold text-slate-900 group-hover:text-indigo-700">
            Attorney sign-in →
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Access the internal dashboard to review leads and mark outreach.
          </p>
        </Link>
      </div>
    </main>
  );
}
