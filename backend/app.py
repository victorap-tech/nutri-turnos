from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from database import db

app = Flask(__name__)
CORS(app)

# DATABASE
database_url = os.environ.get("DATABASE_URL")

if not database_url:
    raise Exception("DATABASE_URL no definida")

if database_url.startswith("postgres://"):
    database_url = database_url.replace("postgres://", "postgresql://", 1)

app.config["SQLALCHEMY_DATABASE_URI"] = database_url
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db.init_app(app)

# ROUTES
@app.route("/")
def home():
    return {"status": "ok"}

@app.route("/health")
def health():
    return {"status": "ok"}

# RUN LOCAL
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
