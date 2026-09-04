from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import logging
import smtplib
from typing import Any, Dict, List
import httpx
from app.config import settings

logger = logging.getLogger("services.notify")

# In-memory dispatch audit log for frontend notification drawer inspection
NOTIFICATION_AUDIT_LOG: List[Dict[str, Any]] = []


async def send_email_alert(
    recipient: str,
    subject: str,
    headline: str,
    body: str,
    action_items: List[str],
) -> bool:
    if not recipient:
        return False

    # Check if SMTP credentials configured
    if not (settings.SMTP_USER and settings.SMTP_PASSWORD):
        logger.info(f"[SIMULATED EMAIL] To: {recipient} | Subject: {subject}")
        NOTIFICATION_AUDIT_LOG.insert(0, {
            "channel": "email",
            "status": "simulated",
            "recipient": recipient,
            "subject": subject,
            "preview": body[:120] + "...",
            "time": "Just now",
        })
        return True

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"Health Alert System <{settings.SMTP_USER}>"
        msg["To"] = recipient

        actions_html = "".join([f"<li style='margin-bottom: 6px;'>{item}</li>" for item in action_items])
        html_content = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
            <h2 style="color: #0f172a; border-bottom: 2px solid #3b82f6; padding-bottom: 8px;">{headline}</h2>
            <p style="font-size: 16px; color: #334155; line-height: 1.6;">{body}</p>
            <h4 style="color: #1e293b; margin-top: 20px;">Immediate Actions:</h4>
            <ul style="color: #475569; padding-left: 20px;">{actions_html}</ul>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin-top: 24px;">
            <p style="font-size: 12px; color: #94a3b8;">Personalized Weather-Health Advisory • Hackathon Prototype</p>
        </div>
        """
        msg.attach(MIMEText(html_content, "html"))

        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.send_message(msg)

        logger.info(f"Email successfully delivered to {recipient}")
        NOTIFICATION_AUDIT_LOG.insert(0, {
            "channel": "email",
            "status": "sent",
            "recipient": recipient,
            "subject": subject,
            "preview": body[:120] + "...",
            "time": "Just now",
        })
        return True
    except Exception as e:
        logger.error(f"Failed to send email to {recipient}: {e}")
        return False


async def send_sms_alert(phone: str, message: str) -> bool:
    if not phone:
        return False

    if settings.SMS_PROVIDER == "fast2sms" and settings.FAST2SMS_API_KEY:
        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                res = await client.post(
                    "https://www.fast2sms.com/dev/bulkV2",
                    headers={"authorization": settings.FAST2SMS_API_KEY},
                    data={
                        "message": message[:160],
                        "language": "english",
                        "route": "q",
                        "numbers": phone.replace("+91", "").strip(),
                    },
                )
                logger.info(f"Fast2SMS response: {res.text}")
                NOTIFICATION_AUDIT_LOG.insert(0, {
                    "channel": "sms",
                    "status": "sent",
                    "recipient": phone,
                    "preview": message[:100] + "...",
                    "time": "Just now",
                })
                return True
        except Exception as e:
            logger.error(f"SMS dispatch failed: {e}")

    # Default simulated SMS for hackathon demo
    logger.info(f"[SIMULATED SMS] To: {phone} | Text: {message[:120]}")
    NOTIFICATION_AUDIT_LOG.insert(0, {
        "channel": "sms",
        "status": "simulated",
        "recipient": phone,
        "preview": message[:100] + "...",
        "time": "Just now",
    })
    return True
