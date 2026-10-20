"""SMTP delivery for account verification messages."""

import smtplib
import ssl
from email.message import EmailMessage

from flask import current_app


class EmailDeliveryError(RuntimeError):
    pass


def send_verification_code(recipient: str, code: str, expires_minutes: int = 10) -> None:
    config = current_app.config
    host = str(config.get("MAIL_SERVER") or "").strip()
    sender = str(config.get("MAIL_DEFAULT_SENDER") or "").strip()
    username = str(config.get("MAIL_USERNAME") or "").strip()
    password = str(config.get("MAIL_PASSWORD") or "")
    if not host or not sender or not username or not password:
        raise EmailDeliveryError("Email sandbox SMTP settings are incomplete.")

    message = EmailMessage()
    message["Subject"] = "Your Resibo verification code"
    message["From"] = sender
    message["To"] = recipient
    message.set_content(
        f"Your Resibo verification code is {code}.\n\n"
        f"It expires in {expires_minutes} minutes. If you did not request this code, "
        "you can ignore this email."
    )

    port = int(config.get("MAIL_PORT") or 2525)
    timeout = 10
    try:
        if config.get("MAIL_USE_SSL"):
            with smtplib.SMTP_SSL(host, port, timeout=timeout, context=ssl.create_default_context()) as server:
                server.login(username, password)
                server.send_message(message)
        else:
            with smtplib.SMTP(host, port, timeout=timeout) as server:
                server.ehlo()
                if config.get("MAIL_USE_TLS"):
                    server.starttls(context=ssl.create_default_context())
                    server.ehlo()
                server.login(username, password)
                server.send_message(message)
    except (OSError, smtplib.SMTPException) as error:
        current_app.logger.error("Verification email delivery failed (%s).", type(error).__name__)
        raise EmailDeliveryError("The verification email could not be sent.") from error
