from flask import Flask, request, jsonify
from flask_cors import CORS
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail
from dotenv import load_dotenv
import os
import pathlib

# --- טעינת משתני סביבה מתוך .env ---
BASE_DIR = pathlib.Path(__file__).resolve().parent
ENV_PATH = BASE_DIR / "portfolio_backend/.env"
load_dotenv(ENV_PATH)

SENDGRID_API_KEY = os.getenv("SENDGRID_API_KEY")
EMAIL_FROM = os.getenv("EMAIL_FROM")
EMAIL_TO = os.getenv("EMAIL_TO")

print("API KEY LOADED:", SENDGRID_API_KEY is not None)
print("EMAIL_FROM:", EMAIL_FROM)
print("EMAIL_TO:", EMAIL_TO)

app = Flask(__name__)
CORS(app)

@app.route("/contact", methods=["POST"])
def contact():
    data = request.get_json()
    name = data.get("name")
    email = data.get("email")
    message = data.get("message")

    print("===== New contact form =====")
    print("Name:", name)
    print("Email:", email)
    print("Message:", message)
    print("============================")

    status = send_contact_email(name, email, message)

    if status is None:
        return jsonify({"status": "error", "message": "Failed to send email"}), 500

    return jsonify({
        "status": "ok",
        "message": "Thanks, your message was received!",
        "sendgrid_status": status
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
        plain_text_content=content
    )

    try:
        sg = SendGridAPIClient(SENDGRID_API_KEY)
        response = sg.send(mail_obj)

        print("=== SENDGRID RESPONSE ===")
        print("Status code:", response.status_code)
        print("Body:", response.body)
        print("Headers:", response.headers)
        print("=== END SENDGRID RESPONSE ===")

        return response.status_code

    except Exception as e:
        print("Error sending email:", e)
        return None


if __name__ == "__main__":
    app.run(debug=True)
