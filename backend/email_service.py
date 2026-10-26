import os

import brevo
from brevo.core.api_error import ApiError
from dotenv import load_dotenv

load_dotenv()


def send_verification_email(email: str, code: str, expiry_minutes: int) -> None:
    """Send a verification OTP email via Brevo transactional email API."""
    api_key = os.getenv("BREVO_API_KEY")
    if not api_key:
        raise RuntimeError("BREVO_API_KEY is not configured")

    sender_email = os.getenv("BREVO_SENDER_EMAIL")
    sender_name = os.getenv("BREVO_SENDER_NAME", "Examora")

    if not sender_email:
        raise RuntimeError("BREVO_SENDER_EMAIL is not configured")

    client = brevo.Brevo(api_key=api_key)

    html_content = (
        "<p>You requested email verification for your <strong>Examora</strong> account registration.</p>"
        f"<p>Your verification code is: <strong style='font-size:1.4em;letter-spacing:2px'>{code}</strong></p>"
        f"<p>This code expires in <strong>{expiry_minutes} minutes</strong>. Do not share it with anyone.</p>"
        "<p>If you did not request this, please ignore this email.</p>"
    )

    try:
        client.transactional_emails.send_transac_email(
            sender=brevo.SendTransacEmailRequestSender(
                email=sender_email,
                name=sender_name,
            ),
            to=[brevo.SendTransacEmailRequestToItem(email=email)],
            subject="Examora Email Verification",
            html_content=html_content,
        )
    except ApiError as exc:
        # Raise a RuntimeError so the caller's existing error handling works.
        # Only include the HTTP status code — never the body, which may contain key details.
        raise RuntimeError(
            f"Brevo API rejected the request (HTTP {exc.status_code})"
        ) from exc