import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/api";

const DIAS = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];
const MESES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];

function startOfWeek(d) {
  const dt = new Date(d);
  const day = dt.getDay();
  dt.setDate(dt.getDate() - day + (day === 0 ? -6 : 1));
  return new Date(dt);
}
function addDays(d, n) { const dt = new Date(d); dt.setDate(dt.getDate() + n); return dt; }
function toISO(d) { return d.toISOString().split("T")[0]; }

function estadoBadge(estado) {
  const map = {
    confirmado: { bg: "#e6f2eb", color: "#2d6a4f", border: "#b7d9c6" },
    cancelado:  { bg: "#fdecea", color: "#b5341a", border: "#f5c6bf" },
    pendiente:  { bg: "#fff4e0", color: "#c47c00", border: "#f5dfa0" },
  };
  return map[estado] || map.pendiente;
}

export default function AdminAgenda() {
  const navigate = useNavigate();
  const [semana, setSemana]   = useState(startOfWeek(new Date()));
  const [turnos, setTurnos]   = useState([]);
  const [vista, setVista]     = useState("semana");
  const [dia, setDia]         = useState(new Date());
  const hoy = toISO(new Date());

  const cargar = async (desde, hasta) => {
    try {
      const data = await api.get(`/turnos?desde=${toISO(desde)}&hasta=${toISO(hasta)}`);
      setTurnos(data);
    } catch(e) {
      if (e.message.includes("401")) { localStorage.removeItem("nutri_token"); navigate("/login"); }
    }
  };

  useEffect(() => {
    if (vista === "semana") cargar(semana, addDays(semana, 4));
    else cargar(dia, dia);
  }, [semana, dia, vista]);

  const diasSemana = [0,1,2,3,4].map(i => addDays(semana, i));
  const turnosDia  = (f) => turnos.filter(t => t.fecha === toISO(f));

  const cambiarEstado = async (id, estado) => {
    await api.put(`/turnos/${id}`, { estado });
    if (vista === "semana") cargar(semana, addDays(semana, 4));
    else cargar(dia, dia);
  };

  const eliminar = async (id) => {
    if (!window.confirm("¿Eliminar este turno?")) return;
    await api.delete(`/turnos/${id}`);
    if (vista === "semana") cargar(semana, addDays(semana, 4));
    else cargar(dia, dia);
  };

  return (
    <div className="container">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <div className="page-title" style={{ marginBottom: 4 }}>Agenda</div>
          <div className="page-subtitle">
            {vista === "semana"
              ? `${semana.getDate()} – ${addDays(semana,4).getDate()} de ${MESES[addDays(semana,4).getMonth()]}`
              : `${dia.getDate()} de ${MESES[dia.getMonth()]}`}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ display: "flex", border: "1.5px solid var(--border)", borderRadius: "var(--radius)", overflow: "hidden" }}>
            {["semana","dia"].map(v => (
              <button key={v} onClick={() => setVista(v)} style={{
                padding: "7px 14px", border: "none", borderRadius: 0, fontSize: "0.85rem",
                background: vista === v ? "var(--accent)" : "var(--surface)",
                color: vista === v ? "white" : "var(--text-muted)", cursor: "pointer",
              }}>{v === "semana" ? "Semana" : "Día"}</button>
            ))}
          </div>
          <button className="btn-primary" onClick={() => navigate("/admin/nuevo")}>+ Nuevo turno</button>
        </div>
      </div>

      {/* Navegación */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 16 }}>
        <button className="btn-ghost" onClick={() => vista === "semana" ? setSemana(addDays(semana,-7)) : setDia(addDays(dia,-1))}>←</button>
        <button className="btn-secondary" style={{ fontSize: "0.8rem", padding: "6px 12px" }}
          onClick={() => { setSemana(startOfWeek(new Date())); setDia(new Date()); }}>Hoy</button>
        <button className="btn-ghost" onClick={() => vista === "semana" ? setSemana(addDays(semana,7)) : setDia(addDays(dia,1))}>→</button>
        {vista === "dia" && (
          <input type="date" value={toISO(dia)}
            onChange={e => setDia(new Date(e.target.value + "T12:00:00"))}
            style={{ maxWidth: 160, marginBottom: 0 }} />
        )}
      </div>

      {/* Vista semana */}
      {vista === "semana" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10 }}>
          {diasSemana.map((d, i) => {
            const iso = toISO(d);
            const esHoy = iso === hoy;
            const tDia = turnosDia(d);
            return (
              <div key={i} style={{ background: "var(--surface)", border: esHoy ? "2px solid var(--accent)" : "1px solid var(--border-light)", borderRadius: "var(--radius-lg)", overflow: "hidden", minHeight: 180 }}>
                <div style={{ padding: "10px 12px", background: esHoy ? "var(--accent)" : "var(--surface-2)", borderBottom: "1px solid var(--border-light)" }}>
                  <div style={{ fontSize: "0.68rem", fontWeight: 600, textTransform: "uppercase", color: esHoy ? "rgba(255,255,255,0.75)" : "var(--text-muted)" }}>{DIAS[d.getDay()]}</div>
                  <div style={{ fontSize: "1.3rem", fontFamily: "var(--font-display, Georgia, serif)", fontWeight: 300, color: esHoy ? "white" : "var(--text)", lineHeight: 1.1 }}>{d.getDate()}</div>
                </div>
                <div style={{ padding: 8 }}>
                  {tDia.length === 0
                    ? <div style={{ fontSize: "0.7rem", color: "var(--text-light)", textAlign: "center", padding: "10px 0" }}>libre</div>
                    : tDia.map(t => {
                        const col = estadoBadge(t.estado);
                        return (
                          <div key={t.id} style={{ background: col.bg, border: `1px solid ${col.border}`, borderRadius: 6, padding: "6px 8px", marginBottom: 5, cursor: "pointer" }}
                            onClick={() => navigate(`/admin/turno/${t.id}`)}>
                            <div style={{ fontSize: "0.75rem", fontWeight: 600, color: col.color }}>{t.hora}</div>
                            <div style={{ fontSize: "0.7rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.nombre}</div>
                            <div style={{ fontSize: "0.62rem", color: "var(--text-muted)" }}>{t.duracion}min</div>
                          </div>
                        );
                      })
                  }
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Vista día */}
      {vista === "dia" && (
        <div>
          {turnosDia(dia).length === 0
            ? <div className="empty-state"><div className="empty-state-icon">📅</div><p>No hay turnos este día.</p></div>
            : turnosDia(dia).map(t => {
                const col = estadoBadge(t.estado);
                return (
                  <div key={t.id} className="card" style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 18px", marginBottom: 10 }}>
                    <div style={{ textAlign: "center", minWidth: 50 }}>
                      <div style={{ fontFamily: "var(--font-display, Georgia, serif)", fontSize: "1.3rem", fontWeight: 300 }}>{t.hora}</div>
                      <div style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>{t.duracion}min</div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600 }}>{t.nombre}</div>
                      {t.telefono && <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{t.telefono}</div>}
                      {t.notas && <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{t.notas}</div>}
                    </div>
                    <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
                      <span style={{ fontSize: "0.72rem", fontWeight: 600, padding: "3px 10px", borderRadius: 99, background: col.bg, color: col.color, border: `1px solid ${col.border}` }}>{t.estado}</span>
                      {t.estado === "pendiente" && <button className="btn-success" style={{ padding: "5px 10px", fontSize: "0.78rem" }} onClick={() => cambiarEstado(t.id, "confirmado")}>✓ Confirmar</button>}
                      {t.estado !== "cancelado" && <button className="btn-danger" style={{ padding: "5px 10px", fontSize: "0.78rem" }} onClick={() => cambiarEstado(t.id, "cancelado")}>✕ Cancelar</button>}
                      <button className="btn-icon" onClick={() => eliminar(t.id)} title="Eliminar">🗑️</button>
                    </div>
                  </div>
                );
              })
          }
        </div>
      )}
    </div>
  );
}
