from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import date, datetime, timedelta
from database import db
from models import Turno, Paciente, Configuracion, Usuario
from telegram_helper import enviar_telegram
from notifier import check_recordatorios, get_conf, nombre_turno
import os
import jwt

app = Flask(__name__)
CORS(app)

# ─────────────────────────────────────────────
# DATABASE (CORREGIDO PARA RAILWAY)
# ─────────────────────────────────────────────
database_url = os.environ.get("DATABASE_URL")

if not database_url:
    raise Exception("❌ DATABASE_URL no definida")

if database_url.startswith("postgres://"):
    database_url = database_url.replace("postgres://", "postgresql://", 1)

app.config["SQLALCHEMY_DATABASE_URI"] = database_url
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["SQLALCHEMY_POOL_PRE_PING"] = True
app.config["SQLALCHEMY_POOL_RECYCLE"] = 280
app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "nutri-turnos-secret")

db.init_app(app)

# ─────────────────────────────────────────────
# AUTH
# ─────────────────────────────────────────────
def make_token(user_id):
    payload = {
        "sub": user_id,
        "exp": datetime.utcnow() + timedelta(hours=12)
    }
    return jwt.encode(payload, app.config["SECRET_KEY"], algorithm="HS256")

def auth_required(f):
    from functools import wraps
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get("Authorization", "").replace("Bearer ", "")
        if not token:
            return jsonify({"error": "unauthorized"}), 401
        try:
            jwt.decode(token, app.config["SECRET_KEY"], algorithms=["HS256"])
        except Exception:
            return jsonify({"error": "token_invalido"}), 401
        return f(*args, **kwargs)
    return decorated

# ─────────────────────────────────────────────
# ERRORES
# ─────────────────────────────────────────────
@app.errorhandler(404)
def not_found(e):
    return jsonify({"error": "not_found"}), 404

@app.errorhandler(500)
def server_error(e):
    return jsonify({"error": "internal_server_error"}), 500

# ─────────────────────────────────────────────
# HEALTH
# ─────────────────────────────────────────────
@app.route("/")
def home():
    return jsonify({"status": "nutri-turnos OK"})

@app.route("/health")
def health():
    return jsonify({"status": "ok"})

# ─────────────────────────────────────────────
# AUTH ROUTES
# ─────────────────────────────────────────────
@app.route("/auth/login", methods=["POST"])
def login():
    data = request.json or {}
    user = Usuario.query.filter_by(username=data.get("username")).first()

    if not user or not user.check_password(data.get("password", "")):
        return jsonify({"error": "credenciales_invalidas"}), 401

    return jsonify({
        "token": make_token(user.id),
        "username": user.username
    })

# ─────────────────────────────────────────────
# TURNOS
# ─────────────────────────────────────────────
@app.route("/turnos", methods=["GET"])
@auth_required
def listar_turnos():
    turnos = Turno.query.order_by(Turno.fecha, Turno.hora).all()
    return jsonify([_dict(t) for t in turnos])

@app.route("/turnos", methods=["POST"])
@auth_required
def crear_turno():
    data = request.json or {}

    t = Turno(
        fecha=date.fromisoformat(data["fecha"]),
        hora=data["hora"],
        duracion=data.get("duracion", 45),
        estado="pendiente",
        notas=data.get("notas"),
        paciente_id=data.get("paciente_id"),
        nombre_libre=data.get("nombre_libre"),
        telefono=data.get("telefono"),
        email=data.get("email"),
    )

    db.session.add(t)
    db.session.commit()

    return jsonify({"id": t.id})

# ─────────────────────────────────────────────
# TURNOS PUBLICO
# ─────────────────────────────────────────────
@app.route("/publico/disponibles", methods=["GET"])
def disponibles_publico():
    fecha_str = request.args.get("fecha")
    if not fecha_str:
        return jsonify({"error": "fecha requerida"}), 400

    ocupados = {
        t.hora for t in Turno.query.filter_by(
            fecha=date.fromisoformat(fecha_str)
        ).filter(Turno.estado != "cancelado").all()
    }

    horarios = [
        "09:00","10:00","11:00","12:00",
        "14:00","15:00","16:00","17:00"
    ]

    return jsonify({
        "disponibles": [h for h in horarios if h not in ocupados]
    })

# ─────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────
def _dict(t):
    return {
        "id": t.id,
        "fecha": t.fecha.isoformat(),
        "hora": t.hora,
        "duracion": t.duracion,
        "estado": t.estado,
        "notas": t.notas,
        "paciente_id": t.paciente_id,
        "nombre": nombre_turno(t),
        "telefono": t.telefono,
        "email": t.email,
        "nombre_libre": t.nombre_libre,
    }

# ─────────────────────────────────────────────
# MAIN (solo local)
# ─────────────────────────────────────────────
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))
    app.run(host="0.0.0.0", port=port)
