from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import date, datetime, timedelta
from database import db
from models import Turno, Paciente, Configuracion, Usuario, Disponibilidad
from telegram_helper import enviar_telegram
from notifier import check_recordatorios, get_conf, nombre_turno
import os
import jwt
import threading
import time
import traceback
from zoneinfo import ZoneInfo
import unicodedata

def normalizar(texto):
    if not texto: return ""
    texto = texto.strip().lower()
    return "".join(c for c in unicodedata.normalize("NFD", texto) if unicodedata.category(c) != "Mn")

ARGENTINA = ZoneInfo("America/Argentina/Buenos_Aires")

def hoy_argentina():
    return datetime.now(ARGENTINA).date()

app = Flask(__name__)
CORS(app)

database_url = os.environ.get("DATABASE_URL", "")
if database_url.startswith("postgres://"):
    database_url = database_url.replace("postgres://", "postgresql+psycopg2://", 1)

app.config["SQLALCHEMY_DATABASE_URI"] = database_url
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["SQLALCHEMY_POOL_PRE_PING"] = True
app.config["SQLALCHEMY_POOL_RECYCLE"] = 280
app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "nutri-turnos-secret")

db.init_app(app)

with app.app_context():
    # Solo crea tablas nuevas, no toca las existentes
    db.create_all()
    # Crear usuario admin por defecto si no existe
    if not Usuario.query.filter_by(username="admin").first():
        u = Usuario(username="admin")
        u.set_password(os.environ.get("ADMIN_PASSWORD", "nutri1234"))
        db.session.add(u)
        db.session.commit()

# ── Scheduler recordatorios ──────────────────────────────
def scheduler_loop():
    while True:
        try:
            with app.app_context():
                result = check_recordatorios()
                print(f"[Scheduler] {result}")
        except Exception as e:
            print(f"[Scheduler error] {e}")
        time.sleep(300)

threading.Thread(target=scheduler_loop, daemon=True).start()

# ── Auth helpers ─────────────────────────────────────────
def make_token(user_id):
    payload = {"sub": user_id, "exp": datetime.utcnow() + timedelta(hours=12)}
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

def to_float(v):
    if v is None or v == "": return None
    try: return float(str(v).replace(",", "."))
    except: return None

# ── Errores ──────────────────────────────────────────────
@app.errorhandler(404)
def not_found(e): return jsonify({"error": "not_found"}), 404

@app.errorhandler(500)
def server_error(e): return jsonify({"error": "internal_server_error"}), 500

def get_or_404(model, id):
    obj = db.session.get(model, id)
    if not obj:
        from flask import abort; abort(404)
    return obj

# ── Health ───────────────────────────────────────────────
@app.route("/")
def home():
    return jsonify({"status": "nutri-turnos OK"})

@app.route("/health")
def health():
    return jsonify({"status": "ok"})

# ── AUTH ─────────────────────────────────────────────────
@app.route("/auth/login", methods=["POST"])
def login():
    data = request.json or {}
    user = Usuario.query.filter_by(username=data.get("username")).first()
    if not user or not user.check_password(data.get("password", "")):
        return jsonify({"error": "credenciales_invalidas"}), 401
    return jsonify({"token": make_token(user.id), "username": user.username})

@app.route("/auth/cambiar-password", methods=["PUT"])
@auth_required
def cambiar_password():
    data = request.json or {}
    user = Usuario.query.filter_by(username="admin").first()
    if not user.check_password(data.get("password_actual", "")):
        return jsonify({"error": "password_incorrecto"}), 400
    user.set_password(data["password_nuevo"])
    db.session.commit()
    return jsonify({"status": "password actualizado"})

# ── TURNOS (admin) ───────────────────────────────────────
@app.route("/turnos", methods=["GET"])
@auth_required
def listar_turnos():
    desde  = request.args.get("desde")
    hasta  = request.args.get("hasta")
    fecha  = request.args.get("fecha")
    q = Turno.query
    if fecha:
        q = q.filter_by(fecha=date.fromisoformat(fecha))
    else:
        if desde: q = q.filter(Turno.fecha >= date.fromisoformat(desde))
        if hasta: q = q.filter(Turno.fecha <= date.fromisoformat(hasta))
    turnos = q.order_by(Turno.fecha, Turno.hora).all()
    return jsonify([_dict(t) for t in turnos])

@app.route("/turnos", methods=["POST"])
@auth_required
def crear_turno_admin():
    data = request.json or {}
    t = _crear_turno(data)
    return jsonify({"id": t.id}), 201

@app.route("/turnos/<int:tid>", methods=["GET"])
@auth_required
def obtener_turno(tid):
    return jsonify(_dict(get_or_404(Turno, tid)))

@app.route("/turnos/<int:tid>", methods=["PUT"])
@auth_required
def actualizar_turno(tid):
    data = request.json or {}
    t = get_or_404(Turno, tid)
    estado_anterior = t.estado
    if data.get("fecha"):    t.fecha    = date.fromisoformat(data["fecha"])
    if data.get("hora"):     t.hora     = data["hora"]
    if data.get("duracion"): t.duracion = data["duracion"]
    if data.get("notas") is not None:   t.notas = data["notas"]
    if data.get("estado"):   t.estado   = data["estado"]
    if data.get("nombre_libre") is not None: t.nombre_libre = data["nombre_libre"]
    if data.get("telefono")  is not None: t.telefono = data["telefono"]
    if data.get("email")     is not None: t.email    = data["email"]
    if "paciente_id" in data: t.paciente_id = data["paciente_id"]
    db.session.commit()

    # Notificar cambio de estado
    if t.estado != estado_anterior:
        bot_token = get_conf("tg_bot_token")
        chat_id   = get_conf("tg_chat_id")
        iconos = {"confirmado": "✅", "cancelado": "❌", "pendiente": "⏳"}
        icono = iconos.get(t.estado, "📋")
        msg = (
            f"{icono} <b>Turno {t.estado}</b>\n"
            f"👤 {nombre_turno(t)}\n"
            f"📆 {t.fecha.strftime('%d/%m/%Y')} a las {t.hora}"
        )
        enviar_telegram(bot_token, chat_id, msg)

    return jsonify({"status": "ok"})

@app.route("/turnos/<int:tid>", methods=["DELETE"])
@auth_required
def eliminar_turno(tid):
    t = get_or_404(Turno, tid)
    db.session.delete(t)
    db.session.commit()
    return jsonify({"status": "eliminado"})

# ── TURNOS (público — sin auth) ──────────────────────────
@app.route("/publico/disponibles", methods=["GET"])
def disponibles_publico():
    fecha_str = request.args.get("fecha")
    if not fecha_str:
        return jsonify({"error": "fecha requerida"}), 400

    fecha_obj = date.fromisoformat(fecha_str)

    # Franjas habilitadas por la profesional para esta fecha
    habilitadas = {
        d.hora for d in Disponibilidad.query.filter_by(fecha=fecha_obj).all()
    }

    if not habilitadas:
        return jsonify({"disponibles": [], "ocupados": []})

    # Quitar los que ya tienen turno
    ocupados = {
        t.hora for t in Turno.query.filter_by(fecha=fecha_obj)
        .filter(Turno.estado != "cancelado").all()
    }

    disponibles = sorted([h for h in habilitadas if h not in ocupados])
    return jsonify({"disponibles": disponibles, "ocupados": list(ocupados)})

@app.route("/publico/reservar", methods=["POST"])
def reservar_publico():
    data = request.json or {}
    try:
        t = _crear_turno(data, notificar=True)
        return jsonify({"id": t.id, "status": "reservado"}), 201
    except Exception:
        traceback.print_exc()
        return jsonify({"error": "no_se_pudo_reservar"}), 500

# ── PACIENTES (para buscador en admin) ───────────────────
@app.route("/pacientes/buscar")
@auth_required
def buscar_pacientes():
    q = (request.args.get("q") or "").strip()
    pacientes = Paciente.query.filter(
        (Paciente.nombre.ilike(f"%{q}%")) |
        (Paciente.apellido.ilike(f"%{q}%")) |
        (Paciente.dni.ilike(f"%{q}%"))
    ).limit(10).all()
    return jsonify([{"id": p.id, "nombre": p.nombre, "apellido": p.apellido, "dni": p.dni} for p in pacientes])

# ── CONFIGURACION ─────────────────────────────────────────
CLAVES = ["tg_bot_token", "tg_chat_id", "agenda_hora_inicio", "agenda_hora_fin",
          "prof_nombre", "agenda_duracion_default", "horarios_semana"]


@app.route("/publico/configuracion", methods=["GET"])
def get_config_publico():
    claves = ["prof_nombre", "agenda_duracion_default", "horarios_semana"]
    result = {}
    for c in claves:
        conf = db.session.get(Configuracion, c)
        result[c] = conf.valor if conf else ""
    return jsonify(result)

@app.route("/configuracion", methods=["GET"])
@auth_required
def get_config():
    return jsonify({c: (db.session.get(Configuracion, c).valor if db.session.get(Configuracion, c) else "") for c in CLAVES})

@app.route("/configuracion", methods=["PUT"])
@auth_required
def set_config():
    data = request.json or {}
    for clave in CLAVES:
        if clave in data:
            conf = db.session.get(Configuracion, clave)
            if conf:
                conf.valor = data[clave]
            else:
                db.session.add(Configuracion(clave=clave, valor=data[clave]))
    db.session.commit()
    return jsonify({"status": "ok"})

# ── SCHEDULER manual ──────────────────────────────────────
@app.route("/check")
@auth_required
def check():
    return jsonify(check_recordatorios())

# ── Helpers ───────────────────────────────────────────────
def _crear_turno(data, notificar=False):
    t = Turno(
        fecha=date.fromisoformat(data["fecha"]),
        hora=data["hora"],
        duracion=data.get("duracion", 45),
        estado=data.get("estado", "pendiente"),
        notas=data.get("notas"),
        paciente_id=data.get("paciente_id"),
        nombre_libre=data.get("nombre_libre"),
        telefono=data.get("telefono"),
        email=data.get("email"),
    )
    db.session.add(t)
    db.session.commit()

    bot_token = get_conf("tg_bot_token")
    chat_id   = get_conf("tg_chat_id")
    if bot_token and chat_id:
        origen = "🌐 reserva online" if notificar else "📋 cargado por admin"
        msg = (
            f"📅 <b>Nuevo turno — {origen}</b>\n\n"
            f"👤 <b>{nombre_turno(t)}</b>\n"
            f"📆 {t.fecha.strftime('%d/%m/%Y')} a las <b>{t.hora}</b>\n"
            f"⏱ {t.duracion} min\n"
        )
        if t.telefono: msg += f"📱 {t.telefono}\n"
        if t.notas:    msg += f"📝 {t.notas}"
        enviar_telegram(bot_token, chat_id, msg)

    return t

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

@app.route("/publico/mis-turnos", methods=["GET"])
def mis_turnos():
    nombre = (request.args.get("nombre") or "").strip()
    if not nombre:
        return jsonify({"error": "nombre requerido"}), 400
    turnos = Turno.query.filter(
        Turno.estado.in_(["pendiente", "confirmado"]),
        Turno.fecha >= hoy_argentina()
    ).order_by(Turno.fecha, Turno.hora).all()
    resultado = [
        _dict(t) for t in turnos
        if normalizar(t.nombre_libre) == normalizar(nombre)
    ]
    return jsonify(resultado)

@app.route("/publico/cancelar/<int:turno_id>", methods=["PUT"])
def cancelar_turno_publico(turno_id):
    nombre = (request.json or {}).get("nombre", "").strip()
    t = get_or_404(Turno, turno_id)
    if normalizar(t.nombre_libre) != normalizar(nombre):
        return jsonify({"error": "no_autorizado"}), 403
    t.estado = "cancelado"
    db.session.commit()
    bot_token = get_conf("tg_bot_token")
    chat_id   = get_conf("tg_chat_id")
    if bot_token and chat_id:
        msg = (
            f"❌ <b>Turno cancelado por el paciente</b>\n"
            f"👤 {t.nombre_libre}\n"
            f"📆 {t.fecha.strftime('%d/%m/%Y')} a las {t.hora}"
        )
        enviar_telegram(bot_token, chat_id, msg)
    return jsonify({"status": "cancelado"})


# ---------------- DISPONIBILIDAD ----------------

@app.route("/disponibilidad", methods=["GET"])
@auth_required
def get_disponibilidad():
    desde = request.args.get("desde")
    hasta = request.args.get("hasta")
    q = Disponibilidad.query
    if desde: q = q.filter(Disponibilidad.fecha >= date.fromisoformat(desde))
    if hasta: q = q.filter(Disponibilidad.fecha <= date.fromisoformat(hasta))
    registros = q.all()
    return jsonify([{"fecha": r.fecha.isoformat(), "hora": r.hora} for r in registros])

@app.route("/disponibilidad", methods=["POST"])
@auth_required
def toggle_disponibilidad():
    """Agrega o elimina una franja horaria"""
    data = request.json or {}
    fecha_obj = date.fromisoformat(data["fecha"])
    hora = data["hora"]

    existente = Disponibilidad.query.filter_by(fecha=fecha_obj, hora=hora).first()
    if existente:
        db.session.delete(existente)
        db.session.commit()
        return jsonify({"accion": "eliminado"})
    else:
        db.session.add(Disponibilidad(fecha=fecha_obj, hora=hora))
        db.session.commit()
        return jsonify({"accion": "agregado"})

@app.route("/disponibilidad/semana", methods=["POST"])
@auth_required
def set_disponibilidad_semana():
    """Reemplaza todas las franjas de una semana"""
    data = request.json or {}
    desde = date.fromisoformat(data["desde"])
    hasta = date.fromisoformat(data["hasta"])
    franjas = data.get("franjas", [])  # [{"fecha": "2026-03-20", "hora": "09:00"}, ...]

    # Borrar semana actual
    Disponibilidad.query.filter(
        Disponibilidad.fecha >= desde,
        Disponibilidad.fecha <= hasta
    ).delete()

    # Agregar nuevas
    for f in franjas:
        db.session.add(Disponibilidad(
            fecha=date.fromisoformat(f["fecha"]),
            hora=f["hora"]
        ))
    db.session.commit()
    return jsonify({"status": "ok", "franjas": len(franjas)})


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))
    app.run(host="0.0.0.0", port=port)
