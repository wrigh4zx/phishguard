from flask import Flask, render_template, request, jsonify

app = Flask(__name__)

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

    text = file.read().decode("utf-8", errors="ignore").lower()

    score = 0
    reasons = []

    checks = {
        "urgent": (20, "Uses urgent language"),
        "verify your account": (25, "Asks you to verify your account"),
        "password": (30, "Mentions password"),
        "click here": (20, "Tells you to click a link"),
        "gift card": (30, "Mentions gift cards"),
        ".exe": (30, "Mentions an executable file"),
        ".zip": (20, "Mentions a compressed file")
    }

    for word, data in checks.items():
        points, reason = data
        if word in text:
            score += points
            reasons.append(reason)

    score = min(score, 100)

    if not reasons:
        reasons.append("No major phishing signs found.")

    return jsonify({
        "score": score,
        "reasons": reasons
    })

if __name__ == "__main__":
    app.run(debug=True)