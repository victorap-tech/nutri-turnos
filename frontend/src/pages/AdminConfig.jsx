import { useEffect, useState } from "react";
import { api } from "../api/api";

export default function AdminConfig() {
  const [form, setForm] = useState({
    tg_bot_token: "",
    tg_chat_id: "",
    prof_nombre: "",
    agenda_duracion_default: "45",
    agenda_hora_inicio: "08:00",
    agenda_hora_fin: "20:00",
  });
  const [pwd, setPwd] = useState({ actual: "", nuevo: "", confirmar: "" });
  const [msg, setMsg] = useState(null);

  const flash = (tipo, texto) => { setMsg({ tipo, texto }); setTimeout(() => setMsg(null), 3000); };

  useEffect(() => {
    api.get("/configuracion").then(data => {
      setForm({
        tg_bot_token:           data.tg_bot_token           || "",
        tg_chat_id:             data.tg_chat_id             || "",
        prof_nombre:            data.prof_nombre            || "",
        agenda_duracion_default: data.agenda_duracion_default || "45",
        agenda_hora_inicio:     data.agenda_hora_inicio     || "08:00",
        agenda_hora_fin:        data.agenda_hora_fin        || "20:00",
      });
    }).catch(() => {});
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const guardar = async () => {
    try {
      await api.put("/configuracion", form);
      flash("success", "Configuración guardada");
    } catch(e) { flash("danger", "Error: " + e.message); }
  };

  const cambiarPwd = async () => {
    if (pwd.nuevo !== pwd.confirmar) { flash("danger", "Las contraseñas no coinciden"); return; }
    try {
      await api.put("/auth/cambiar-password", { password_actual: pwd.actual, password_nuevo: pwd.nuevo });
      flash("success", "Contraseña actualizada");
      setPwd({ actual: "", nuevo: "", confirmar: "" });
    } catch { flash("danger", "Contraseña actual incorrecta"); }
  };

  return (
    <div className="container">
      <div className="page-title" style={{ marginBottom: 28 }}>Configuración</div>
      {msg && <div className={`alert alert-${msg.tipo}`} style={{ marginBottom: 20 }}>{msg.texto}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div className="card">
          <div className="card-title">Profesional</div>
          <div className="form-group">
            <label>Nombre profesional</label>
            <input value={form.prof_nombre} onChange={e => set("prof_nombre", e.target.value)} />
          </div>
          <div className="form-group">
            <label>Duración de turnos (min)</label>
            <select value={form.agenda_duracion_default} onChange={e => set("agenda_duracion_default", e.target.value)}>
              {[15,20,30,45,60,90].map(d => <option key={d} value={d}>{d} min</option>)}
            </select>
          </div>
          <div className="form-row">
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Hora inicio grilla</label>
              <input type="time" value={form.agenda_hora_inicio} onChange={e => set("agenda_hora_inicio", e.target.value)} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Hora fin grilla</label>
              <input type="time" value={form.agenda_hora_fin} onChange={e => set("agenda_hora_fin", e.target.value)} />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-title">Telegram</div>
          <div className="form-group">
            <label>Bot Token</label>
            <input value={form.tg_bot_token} onChange={e => set("tg_bot_token", e.target.value)} placeholder="123456:ABC..." />
          </div>
          <div className="form-group">
            <label>Chat ID</label>
            <input value={form.tg_chat_id} onChange={e => set("tg_chat_id", e.target.value)} placeholder="-1001234567890" />
            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 4 }}>
              Usá @userinfobot en Telegram para obtener tu Chat ID.
            </div>
          </div>
        </div>
      </div>

      <button className="btn-primary" onClick={guardar} style={{ marginTop: 20, marginBottom: 32 }}>
        Guardar configuración
      </button>

      <div className="card" style={{ maxWidth: 420 }}>
        <div className="card-title">Cambiar contraseña</div>
        <div className="form-group"><label>Contraseña actual</label><input type="password" value={pwd.actual} onChange={e => setPwd(p => ({ ...p, actual: e.target.value }))} /></div>
        <div className="form-group"><label>Nueva contraseña</label><input type="password" value={pwd.nuevo} onChange={e => setPwd(p => ({ ...p, nuevo: e.target.value }))} /></div>
        <div className="form-group"><label>Confirmar nueva</label><input type="password" value={pwd.confirmar} onChange={e => setPwd(p => ({ ...p, confirmar: e.target.value }))} /></div>
        <button className="btn-secondary" onClick={cambiarPwd}>Cambiar contraseña</button>
      </div>
    </div>
  );
}
