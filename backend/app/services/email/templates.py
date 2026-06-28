"""Builders for the two transactional emails sent on a new lead submission.

SECURITY: every interpolated value is user-controlled (a prospect chooses their own name
and email), so all values embedded in the HTML body are HTML-escaped to prevent injection
into the recipient's email client. The plain-text body needs no escaping.
"""

from __future__ import annotations

import html

from app.services.email.base import EmailMessage


def build_prospect_email(first_name: str, to_email: str) -> EmailMessage:
    safe_first = html.escape(first_name)

    subject = "We received your application — Alma"
    text = (
        f"Hi {first_name},\n\n"
        "Thanks for submitting your information to Alma. We've received your application "
        "and resume, and an attorney on our team will review it and reach out to you soon.\n\n"
        "— The Alma Team"
    )
    html_body = f"""\
<div style="font-family:ui-sans-serif,system-ui,sans-serif;max-width:560px;margin:auto;color:#0f172a">
  <h2 style="color:#4f46e5">Thanks, {safe_first}!</h2>
  <p>We've received your application and resume. An attorney on our team will review it
     and reach out to you soon.</p>
  <p style="color:#64748b;font-size:14px">— The Alma Team</p>
</div>"""
    return EmailMessage(to=to_email, subject=subject, html=html_body, text=text)


def build_attorney_email(
    first_name: str,
    last_name: str,
    prospect_email: str,
    attorney_email: str,
    dashboard_url: str,
) -> EmailMessage:
    full_name = f"{first_name} {last_name}"
    safe_full_name = html.escape(full_name)
    safe_email = html.escape(prospect_email)
    safe_url = html.escape(dashboard_url, quote=True)

    subject = f"New lead: {full_name}"
    text = (
        f"A new lead has been submitted.\n\n"
        f"Name:  {full_name}\n"
        f"Email: {prospect_email}\n\n"
        f"Review the lead (and download the resume) here:\n{dashboard_url}\n"
    )
    html_body = f"""\
<div style="font-family:ui-sans-serif,system-ui,sans-serif;max-width:560px;margin:auto;color:#0f172a">
  <h2 style="color:#4f46e5">New lead submitted</h2>
  <table style="font-size:15px;border-collapse:collapse">
    <tr><td style="padding:4px 12px 4px 0;color:#64748b">Name</td><td><strong>{safe_full_name}</strong></td></tr>
    <tr><td style="padding:4px 12px 4px 0;color:#64748b">Email</td><td>{safe_email}</td></tr>
  </table>
  <p style="margin-top:20px">
    <a href="{safe_url}"
       style="background:#4f46e5;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">
      Review lead &amp; download resume
    </a>
  </p>
  <p style="color:#94a3b8;font-size:13px">This link opens the secure dashboard, which mints a
     fresh download link on demand — so it never expires.</p>
</div>"""
    return EmailMessage(to=attorney_email, subject=subject, html=html_body, text=text)
