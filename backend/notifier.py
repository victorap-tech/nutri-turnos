from datetime import datetime, timedelta
from database import db
from models import Turno, Configuracion, Paciente
from telegram_helper import enviar_telegram

def get_conf(clave):
    c = db.session.get(Configuracion, clave)
    return c.valor if c else ""

def nombre_turno(t):
    if t.paciente_id:
        p = db.session.get(Paciente, t.paciente_id)
        if p:
            return f"{p.apellido}, {p.nombre}"
    return t.nombre_libre or "Paciente"

def check_recordatorios():
    bot_token = get_conf("tg_bot_token")
    chat_id   = get_conf("tg_chat_id")
    if not bot_token or not chat_id:
        return {"status": "skip", "motivo": "Telegram no configurado"}

    ahora  = datetime.now()
    en_2hs = ahora + timedelta(hours=2)

    turnos = Turno.query.filter(
        Turno.estado.in_(["pendiente", "confirmado"]),
        Turno.recordatorio_enviado == False,
        Turno.fecha.between(ahora.date(), en_2hs.date())
    ).all()

    enviados = 0
    for t in turnos:
        try:
            turno_dt = datetime.combine(t.fecha, datetime.strptime(t.hora, "%H:%M").time())
        except Exception:
            continue
        diff = (turno_dt - ahora).total_seconds() / 60
        if not (110 <= diff <= 130):
            continue
        nombre = nombre_turno(t)
        msg = (
            f"⏰ <b>Recordatorio — turno en 2 horas</b>\n\n"
            f"👤 <b>{nombre}</b>\n"
            f"📆 Hoy a las <b>{t.hora}</b>\n"
            f"⏱ {t.duracion} min\n"
        )
        if t.telefono:
            msg += f"📱 {t.telefono}\n"
        if t.notas:
            msg += f"📝 {t.notas}"
        ok = enviar_telegram(bot_token, chat_id, msg)
        if ok:
            t.recordatorio_enviado = True
            enviados += 1

    if enviados:
        db.session.commit()
    return {"status": "ok", "enviados": enviados}
