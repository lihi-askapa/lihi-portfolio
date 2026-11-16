from flask import Flask, request, jsonify
from flask_cors import CORS
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail
from dotenv import load_dotenv
import logging
import os
import pathlib
import re

# --- טעינת משתני סביבה מתוך .env (לפיתוח מקומי בלבד; ב-Render מגדירים Environment Variables) ---
BASE_DIR = pathlib.Path(__file__).resolve().parent
ENV_PATH = BASE_DIR / "portfolio_backend/.env"
load_dotenv(ENV_PATH)

SENDGRID_API_KEY = os.getenv("SENDGRID_API_KEY")
EMAIL_FROM = os.getenv("EMAIL_FROM")
EMAIL_TO = os.getenv("EMAIL_TO")

# רק האתר שלי (ו-localhost לפיתוח) יכולים לשלוח בקשות ל-API
ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "ALLOWED_ORIGINS",
        "https://lihi-portfolio-site.onrender.com,http://localhost:5500,http://127.0.0.1:5500",
    ).split(",")
    if origin.strip()
]

MAX_NAME_LEN = 100
MAX_EMAIL_LEN = 254
MAX_MESSAGE_LEN = 5000
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("portfolio-backend")

# לא מדפיסים כתובות מייל או מפתחות - רק אם ההגדרות קיימות
log.info(
    "Config loaded: sendgrid_key=%s email_from=%s email_to=%s",
    bool(SENDGRID_API_KEY), bool(EMAIL_FROM), bool(EMAIL_TO),
)

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 16 * 1024  # 16KB, מספיק לטופס יצירת קשר
CORS(app, origins=ALLOWED_ORIGINS, methods=["POST"])


def clean_single_line(value):
    """מסיר ירידות שורה כדי שאי אפשר יהיה להזריק כותרות לנושא המייל."""
    return re.sub(r"[\r\n]+", " ", value).strip()


def validate(data):
    if not isinstance(data, dict):
        return None, "Invalid request."

    name = data.get("name")
    email = data.get("email")
    message = data.get("message")

    if not all(isinstance(v, str) for v in (name, email, message)):
        return None, "Name, email and message are required."

    name = clean_single_line(name)
    email = clean_single_line(email)
    message = message.strip()

    if not name or not email or not message:
        return None, "Name, email and message are required."
    if len(name) > MAX_NAME_LEN or len(email) > MAX_EMAIL_LEN or len(message) > MAX_MESSAGE_LEN:
        return None, "One of the fields is too long."
    if not EMAIL_RE.match(email):
        return None, "Please enter a valid email address."

    return {"name": name, "email": email, "message": message}, None


@app.route("/contact", methods=["POST"])
def contact():
    data, error = validate(request.get_json(silent=True))
    if error:
        return jsonify({"status": "error", "message": error}), 400

    # רושמים רק שהתקבלה הודעה, בלי שם, מייל או תוכן
    log.info("Contact form received (message length: %d)", len(data["message"]))

    status = send_contact_email(data["name"], data["email"], data["message"])

    if status is None:
        return jsonify({"status": "error", "message": "Failed to send email"}), 500

    return jsonify({
        "status": "ok",
        "message": "Thanks, your message was received!",
    }), 200


def send_contact_email(name, email, message):
    content = f"""
New contact form submission:

Name: {name}
Email: {email}

Message:
{message}
"""

    mail_obj = Mail(
        from_email=EMAIL_FROM,
        to_emails=EMAIL_TO,
        subject=f"New message from {name}",
        plain_text_content=content,
    )
    mail_obj.reply_to = email

    try:
        sg = SendGridAPIClient(SENDGRID_API_KEY)
        response = sg.send(mail_obj)
        log.info("SendGrid status: %s", response.status_code)
        return response.status_code

    except Exception as e:
        # רק סוג השגיאה, בלי פרטי ההודעה
        log.error("Error sending email: %s", type(e).__name__)
        return None


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    debug = os.environ.get("FLASK_DEBUG") == "1"
    app.run(host="127.0.0.1", port=port, debug=debug)
