from flask import Flask, render_template, request, jsonify
from PIL import Image
import pytesseract
import io

app = Flask(__name__)

def scan_text(text):
    text = text.lower()
    score = 0
    reasons = []

    checks = {
        "urgent": (20, "Uses urgent language"),
        "verify your account": (25, "Asks you to verify your account"),
        "password": (30, "Mentions password"),
        "click here": (20, "Tells you to click a link"),
        "login": (20, "Mentions login"),
        "account suspended": (25, "Mentions account suspension"),
        "gift card": (30, "Mentions gift cards"),
    }

    for phrase, info in checks.items():
        points, reason = info
        if phrase in text:
            score += points
            reasons.append(reason)

    score = min(score, 100)

    if not reasons:
        reasons.append("No major phishing signs found.")

    return score, reasons

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/scan", methods=["POST"])
def scan():
    file = request.files.get("file")

    if not file:
        return jsonify({
            "score": 0,
            "reasons": ["No file uploaded."]
        })

    image = Image.open(io.BytesIO(file.read()))
    extracted_text = pytesseract.image_to_string(image)

    score, reasons = scan_text(extracted_text)

    return jsonify({
        "score": score,
        "reasons": reasons,
        "extractedText": extracted_text
    })

if __name__ == "__main__":
    app.run(debug=True)