import { useEffect, useState } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:5001";
const MESES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
const DIAS  = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];

function toISO(d) { return d.toISOString().split("T")[0]; }
function addDays(d,n) { const dt = new Date(d); dt.setDate(dt.getDate()+n); return dt; }

export default function Reservar() {
  const [paso, setPaso]       = useState(1);
  const [fecha, setFecha]     = useState(null);
  const [hora, setHora]       = useState("");
  const [duracion, setDuracion] = useState(45);
  const [disponibles, setDisponibles] = useState([]);
  const [form, setForm]       = useState({ nombre_libre: "", telefono: "", email: "", notas: "" });
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState("");
  const [profNombre, setProfNombre] = useState("");

  const diasHabiles = [];
  let d = addDays(new Date(), 1);
  while (diasHabiles.length < 14) {
    if (d.getDay() >= 1 && d.getDay() <= 5) diasHabiles.push(new Date(d));
    d = addDays(d, 1);
  }

  useEffect(() => {
    fetch(`${API}/publico/configuracion`)
      .then(r => r.json()).then(data => setProfNombre(data.prof_nombre || "")).catch(() => {});
  }, []);

  useEffect(() => {
    if (!fecha) return;
    fetch(`${API}/publico/disponibles?fecha=${toISO(fecha)}&duracion=${duracion}`)
      .then(r => r.json()).then(d => setDisponibles(d.disponibles || [])).catch(() => {});
  }, [fecha, duracion]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const confirmar = async () => {
    if (!form.nombre_libre || !form.telefono) { setError("Nombre y teléfono son obligatorios"); return; }
    setSaving(true); setError("");
    try {
      const res = await fetch(`${API}/publico/reservar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fecha: toISO(fecha), hora, duracion, ...form, estado: "pendiente" }),
      });
      if (!res.ok) throw new Error();
      setPaso(3);
    } catch { setError("No se pudo reservar. Intentá de nuevo."); }
    setSaving(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start", padding: "40px 16px" }}>
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <div style={{ fontFamily: "var(--font-display, Georgia, serif)", fontSize: "2.2rem", fontWeight: 400, color: "var(--text)" }}>
          Reservá tu turno
        </div>
        {profNombre && <div style={{ fontSize: "0.9rem", color: "var(--text-muted)", marginTop: 6 }}>{profNombre}</div>}
      </div>

      {/* Steps indicator */}
      <div style={{ display: "flex", gap: 8, marginBottom: 28, alignItems: "center" }}>
        {[1,2,3].map(s => (
          <div key={s} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "0.8rem", fontWeight: 600,
              background: paso >= s ? "var(--accent)" : "var(--surface-2)",
              color: paso >= s ? "white" : "var(--text-muted)",
              border: `2px solid ${paso >= s ? "var(--accent)" : "var(--border)"}`,
            }}>{s}</div>
            {s < 3 && <div style={{ width: 32, height: 2, background: paso > s ? "var(--accent)" : "var(--border)" }} />}
          </div>
        ))}
      </div>

      <div className="card" style={{ width: "100%", maxWidth: 540 }}>

        {/* Paso 1 */}
        {paso === 1 && (
          <>
            <div className="card-title">¿Qué día preferís?</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: 8, marginBottom: 24 }}>
              {diasHabiles.map((dia, i) => {
                const sel = fecha && toISO(dia) === toISO(fecha);
                return (
                  <button key={i} onClick={() => { setFecha(dia); setHora(""); }} style={{
                    padding: "10px 8px", borderRadius: "var(--radius)", border: `1.5px solid ${sel ? "var(--accent)" : "var(--border)"}`,
                    background: sel ? "var(--accent)" : "var(--surface)", color: sel ? "white" : "var(--text)",
                    cursor: "pointer", textAlign: "center", fontFamily: "var(--font-body)",
                  }}>
                    <div style={{ fontSize: "0.7rem", opacity: 0.8 }}>{DIAS[dia.getDay()]}</div>
                    <div style={{ fontSize: "1.2rem", fontFamily: "var(--font-display, Georgia, serif)", fontWeight: 300 }}>{dia.getDate()}</div>
                    <div style={{ fontSize: "0.65rem", opacity: 0.7 }}>{MESES[dia.getMonth()].slice(0,3)}</div>
                  </button>
                );
              })}
            </div>

            {fecha && (
              <>
                <div className="card-title">Duración</div>
                <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
                  {[30,45,60].map(d => (
                    <button key={d} onClick={() => setDuracion(d)} style={{
                      padding: "7px 16px", borderRadius: "var(--radius-sm)",
                      border: `1.5px solid ${duracion === d ? "var(--accent)" : "var(--border)"}`,
                      background: duracion === d ? "var(--accent)" : "var(--surface)",
                      color: duracion === d ? "white" : "var(--text)", cursor: "pointer", fontFamily: "var(--font-body)",
                    }}>{d} min</button>
                  ))}
                </div>

                <div className="card-title">Horarios disponibles</div>
                {disponibles.length === 0
                  ? <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", marginBottom: 16 }}>No hay horarios disponibles para este día.</p>
                  : <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
                      {disponibles.map(h => (
                        <button key={h} onClick={() => setHora(h)} style={{
                          padding: "8px 16px", borderRadius: "var(--radius-sm)",
                          border: `1.5px solid ${hora === h ? "var(--accent)" : "var(--border)"}`,
                          background: hora === h ? "var(--accent)" : "var(--surface)",
                          color: hora === h ? "white" : "var(--text)",
                          fontSize: "0.9rem", cursor: "pointer", fontFamily: "var(--font-body)",
                        }}>{h}</button>
                      ))}
                    </div>
                }
                <button className="btn-primary" disabled={!hora} onClick={() => setPaso(2)}>Continuar →</button>
              </>
            )}
          </>
        )}

        {/* Paso 2 */}
        {paso === 2 && (
          <>
            <div className="card-title">Tus datos</div>
            <div style={{ padding: "10px 14px", background: "var(--accent-light)", borderRadius: "var(--radius)", marginBottom: 20, fontSize: "0.875rem", color: "var(--accent-dark, #1b4332)" }}>
              📅 {fecha && `${fecha.getDate()} de ${MESES[fecha.getMonth()]}`} a las {hora} · {duracion} min
            </div>
            {error && <div className="alert alert-danger" style={{ marginBottom: 16 }}>{error}</div>}
            <div className="form-group"><label>Nombre y apellido *</label><input value={form.nombre_libre} onChange={e => set("nombre_libre", e.target.value)} placeholder="Tu nombre completo" /></div>
            <div className="form-group"><label>Teléfono *</label><input value={form.telefono} onChange={e => set("telefono", e.target.value)} placeholder="+54 9 11 1234 5678" /></div>
            <div className="form-group"><label>Email</label><input type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="correo@ejemplo.com" /></div>
            <div className="form-group"><label>Motivo (opcional)</label><textarea rows={2} value={form.notas} onChange={e => set("notas", e.target.value)} /></div>
            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn-secondary" onClick={() => setPaso(1)}>← Atrás</button>
              <button className="btn-primary" onClick={confirmar} disabled={saving}>{saving ? "Reservando..." : "Confirmar turno"}</button>
            </div>
          </>
        )}

        {/* Paso 3 */}
        {paso === 3 && (
          <div style={{ textAlign: "center", padding: "32px 0" }}>
            <div style={{ fontSize: "3.5rem", marginBottom: 16 }}>✅</div>
            <div style={{ fontFamily: "var(--font-display, Georgia, serif)", fontSize: "1.6rem", marginBottom: 8 }}>¡Turno reservado!</div>
            <div style={{ color: "var(--text-muted)", marginBottom: 4 }}>
              {fecha && `${fecha.getDate()} de ${MESES[fecha.getMonth()]}`} a las {hora}
            </div>
            <div style={{ color: "var(--text-muted)", fontSize: "0.875rem", marginTop: 8 }}>
              Te vamos a contactar para confirmarlo.
            </div>
            <button className="btn-secondary" style={{ marginTop: 24 }} onClick={() => { setPaso(1); setFecha(null); setHora(""); setForm({ nombre_libre: "", telefono: "", email: "", notas: "" }); }}>
              Reservar otro turno
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
