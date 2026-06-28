from app.core.config import settings
from app.services.email.fake import FakeEmailClient
from app.services.email.service import send_new_lead_notifications
from app.services.email.templates import build_attorney_email, build_prospect_email


def test_prospect_email_escapes_html_but_keeps_plaintext():
    msg = build_prospect_email("<b>evil</b>", "prospect@example.com")
    assert msg.to == "prospect@example.com"
    assert "&lt;b&gt;evil&lt;/b&gt;" in msg.html
    assert "<b>evil</b>" not in msg.html
    assert "<b>evil</b>" in msg.text  # plain-text body is intentionally not escaped


def test_attorney_email_links_dashboard_and_escapes():
    msg = build_attorney_email(
        "<i>x",
        "Doe",
        'e"@x.com',
        "attorney@firm.test",
        "http://app/dashboard/abc?a=1&b=2",
    )
    assert msg.to == "attorney@firm.test"
    assert "/dashboard/abc" in msg.html
    assert "&amp;b=2" in msg.html  # URL ampersand escaped in the href
    assert "<i>x" not in msg.html


def test_send_notifications_emails_both_parties():
    fake = FakeEmailClient()
    send_new_lead_notifications(
        lead_id="abc",
        first_name="Ada",
        last_name="Lovelace",
        email="ada@example.com",
        client=fake,
    )
    assert len(fake.sent) == 2
    recipients = {m.to for m in fake.sent}
    assert "ada@example.com" in recipients
    assert settings.attorney_email in recipients
