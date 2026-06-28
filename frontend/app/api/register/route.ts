import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

// Gated attorney sign-up: a valid registration code (a server-side secret) is required before
// an account is created — so the client can't bypass it and randoms can't self-provision access
// to prospect PII. The code is checked here, never trusted from the client beyond this point.
export async function POST(req: Request) {
  let body: { name?: string; email?: string; password?: string; code?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid request." }, { status: 400 });
  }

  const { name, email, password, code } = body;
  const expected = process.env.REGISTRATION_CODE;

  if (!expected || code !== expected) {
    return NextResponse.json({ message: "Invalid registration code." }, { status: 403 });
  }
  if (!name?.trim() || !email?.trim() || !password) {
    return NextResponse.json(
      { message: "Name, email, and password are required." },
      { status: 400 },
    );
  }

  try {
    // Better Auth creates the account (enforcing the password policy) and signs the user in;
    // returning its Response forwards the session cookie to the browser.
    return await auth.api.signUpEmail({
      body: { name: name.trim(), email: email.trim(), password },
      asResponse: true,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not create the account.";
    const status = (err as { statusCode?: number })?.statusCode ?? 400;
    return NextResponse.json({ message }, { status });
  }
}
