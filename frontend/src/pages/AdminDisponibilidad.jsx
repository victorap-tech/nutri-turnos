import { useEffect, useState } from "react";
import { api } from "../api/api";

const DIAS_LABEL = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];

function startOfWeek(d) {
  const dt = new Date(d);
  const day = dt.getDay();
  dt.setDate(dt.getDate() - day + (day === 0 ? -6 : 1));
  return new Date(dt);
}
function addDays(d, n) { const dt = new Date(d); dt.setDate(dt.getDate() + n); return dt; }
function toISO(d) { return d.toISOString().split("T")[0]; }

function generarSlots(inicio, fin, duracion) {
  const slots = [];
  let [h, m] = inicio.split(":").map(Number);
  const [hf, mf] = fin.split(":").map(Number);
  while (h * 60 + m + duracion <= hf * 60 + mf) {
    slots.push(`${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`);
    m += duracion;
    if (m >= 60) { h += Math.floor(m/60); m = m % 60; }
  }
  return slots;
}

export default function AdminDisponibilidad() {
  const [semana, setSemana]         = useState(startOfWeek(new Date()));
  const [habilitadas, setHabilitadas] = useState(new Set()); // "fecha|hora"
  const [turnos, setTurnos]         = useState({}); // "fecha|hora" -> turno
  const [saving, setSaving]         = useState(false);
  const [msg, setMsg]               = useState(null);
  const [config, setConfig]         = useState({ inicio: "08:00", fin: "19:00", duracion: 45 });

  const diasSemana = [0,1,2,3,4].map(i => addDays(semana, i)); // lun-vie
  const desde = toISO(semana);
  const hasta = toISO(addDays(semana, 4));
  const slots = generarSlots(config.inicio, config.fin, config.duracion);

  const cargar = async () => {
    try {
      // Config
      const cfg = await api.get("/configuracion");
      setConfig({
        inicio: cfg.agenda_hora_inicio || "08:00",
        fin: cfg.agenda_hora_fin || "19:00",
        duracion: Number(cfg.agenda_duracion_default || 45),
      });

      // Disponibilidad
      const disp = await api.get(`/disponibilidad?desde=${desde}&hasta=${hasta}`);
      setHabilitadas(new Set(disp.map(d => `${d.fecha}|${d.hora}`)));

      // Turnos
      const ts = await api.get(`/turnos?desde=${desde}&hasta=${hasta}`);
      const map = {};
      ts.forEach(t => { if (t.estado !== "cancelado") map[`${t.fecha}|${t.hora}`] = t; });
      setTurnos(map);
    } catch(e) { console.error(e); }
  };

  useEffect(() => { cargar(); }, [semana]);

  const toggle = (fecha, hora) => {
    const key = `${fecha}|${hora}`;
    if (turnos[key]) return; // no se puede deshabilitar si hay turno
    const nuevo = new Set(habilitadas);
    if (nuevo.has(key)) nuevo.delete(key);
    else nuevo.add(key);
    setHabilitadas(nuevo);
  };

  const guardar = async () => {
    setSaving(true);
    try {
      const franjas = [...habilitadas].map(k => {
        const [fecha, hora] = k.split("|");
        return { fecha, hora };
      });
      await api.post("/disponibilidad/semana", { desde, hasta, franjas });
      setMsg({ tipo: "success", texto: "Disponibilidad guardada" });
      setTimeout(() => setMsg(null), 3000);
    } catch(e) {
      setMsg({ tipo: "danger", texto: "Error: " + e.message });
    }
    setSaving(false);
  };

  const habilitarDia = (dia) => {
    const isoFecha = toISO(dia);
    const nuevo = new Set(habilitadas);
    slots.forEach(h => nuevo.add(`${isoFecha}|${h}`));
    setHabilitadas(nuevo);
  };

  const limpiarDia = (dia) => {
    const isoFecha = toISO(dia);
    const nuevo = new Set([...habilitadas].filter(k => !k.startsWith(isoFecha)));
    setHabilitadas(nuevo);
  };

  return (
    <div className="container">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <div className="page-title" style={{ marginBottom: 4 }}>Disponibilidad</div>
          <div className="page-subtitle">Hacé clic en las franjas para habilitarlas o bloquearlas</div>
        </div>
        <button className="btn-primary" onClick={guardar} disabled={saving}>
          {saving ? "Guardando..." : "Guardar semana"}
        </button>
      </div>

      {msg && <div className={`alert alert-${msg.tipo}`} style={{ marginBottom: 16 }}>{msg.texto}</div>}

      {/* Navegación semana */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 20 }}>
        <button className="btn-ghost" onClick={() => setSemana(addDays(semana, -7))}>←</button>
        <button className="btn-secondary" style={{ fontSize: "0.8rem", padding: "6px 12px" }}
          onClick={() => setSemana(startOfWeek(new Date()))}>Esta semana</button>
        <button className="btn-ghost" onClick={() => setSemana(addDays(semana, 7))}>→</button>
        <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginLeft: 8 }}>
          {semana.getDate()}/{semana.getMonth()+1} – {addDays(semana,4).getDate()}/{addDays(semana,4).getMonth()+1}
        </span>
      </div>

      {/* Leyenda */}
      <div style={{ display: "flex", gap: 16, marginBottom: 16, fontSize: "0.78rem" }}>
        {[
          { color: "var(--accent)", label: "Habilitado" },
          { color: "var(--surface-3)", label: "Bloqueado" },
          { color: "#ff6b6b", label: "Con turno" },
        ].map(({ color, label }) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 14, height: 14, borderRadius: 3, background: color }} />
            <span style={{ color: "var(--text-muted)" }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Grilla */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ minWidth: 600 }}>
          <thead>
            <tr>
              <th style={{ width: 60, background: "var(--surface-2)", color: "var(--text-muted)", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Hora
              </th>
              {diasSemana.map((dia, i) => (
                <th key={i} style={{ background: "var(--surface-2)", padding: "10px 6px", textAlign: "center", minWidth: 100 }}>
                  <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    {DIAS_LABEL[dia.getDay()]}
                  </div>
                  <div style={{ fontSize: "1.1rem", fontFamily: "var(--font-display, Georgia, serif)", fontWeight: 300, color: "var(--text)" }}>
                    {dia.getDate()}
                  </div>
                  <div style={{ display: "flex", gap: 4, justifyContent: "center", marginTop: 4 }}>
                    <button onClick={() => habilitarDia(dia)} title="Habilitar todo el día"
                      style={{ fontSize: "0.6rem", padding: "2px 6px", borderRadius: 4, border: "1px solid var(--accent)", background: "var(--accent-light)", color: "var(--accent)", cursor: "pointer" }}>
                      Todo
                    </button>
                    <button onClick={() => limpiarDia(dia)} title="Limpiar día"
                      style={{ fontSize: "0.6rem", padding: "2px 6px", borderRadius: 4, border: "1px solid var(--border)", background: "var(--surface-3)", color: "var(--text-muted)", cursor: "pointer" }}>
                      ✕
                    </button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slots.map(hora => (
              <tr key={hora}>
                <td style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: 500, textAlign: "center", padding: "2px 8px", borderBottom: "1px solid var(--border-light)" }}>
                  {hora}
                </td>
                {diasSemana.map((dia, i) => {
                  const isoFecha = toISO(dia);
                  const key = `${isoFecha}|${hora}`;
                  const tieneTurno = !!turnos[key];
                  const habilitado = habilitadas.has(key);
                  return (
                    <td key={i} style={{ padding: "2px 4px", borderBottom: "1px solid var(--border-light)" }}>
                      <div
                        onClick={() => toggle(isoFecha, hora)}
                        style={{
                          height: 32,
                          borderRadius: 6,
                          cursor: tieneTurno ? "not-allowed" : "pointer",
                          background: tieneTurno ? "#ff6b6b" : habilitado ? "var(--accent)" : "var(--surface-2)",
                          border: `1px solid ${tieneTurno ? "#ff6b6b" : habilitado ? "var(--accent)" : "var(--border-light)"}`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          transition: "all 0.1s",
                          opacity: tieneTurno ? 0.8 : 1,
                        }}
                        title={tieneTurno ? `Turno: ${turnos[key].nombre}` : habilitado ? "Clic para bloquear" : "Clic para habilitar"}
                      >
                        {tieneTurno && <span style={{ fontSize: "0.65rem", color: "white", fontWeight: 600, padding: "0 4px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 80 }}>
                          {turnos[key].nombre?.split(",")[0] || "Turno"}
                        </span>}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
