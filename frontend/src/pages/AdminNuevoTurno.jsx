import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/api";

export default function AdminNuevoTurno() {
  const navigate = useNavigate();
  const [busqueda, setBusqueda]   = useState("");
  const [pacientes, setPacientes] = useState([]);
  const [pacSel, setPacSel]       = useState(null);
  const [disponibles, setDisponibles] = useState([]);
  const [saving, setSaving]       = useState(false);
  const [msg, setMsg]             = useState(null);
  const [form, setForm] = useState({
    fecha: new Date().toISOString().split("T")[0],
    hora: "", duracion: 45, notas: "",
    nombre_libre: "", telefono: "", email: "",
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    if (busqueda.length < 2) { setPacientes([]); return; }
    const t = setTimeout(() => api.get(`/pacientes/buscar?q=${busqueda}`).then(setPacientes).catch(() => {}), 300);
    return () => clearTimeout(t);
  }, [busqueda]);

  useEffect(() => {
    if (!form.fecha) return;
    api.get(`/disponibilidad?desde=${form.fecha}&hasta=${form.fecha}`)
      .then(registros => {
        // Get ocupados
        api.get(`/turnos?fecha=${form.fecha}`)
          .then(turnos => {
            const ocupados = new Set(turnos.filter(t => t.estado !== 'cancelado').map(t => t.hora));
            const disponibles = registros.map(r => r.hora).filter(h => !ocupados.has(h)).sort();
            setDisponibles(disponibles);
          }).catch(() => {});
      }).catch(() => {});
  }, [form.fecha, form.duracion]);

  const guardar = async () => {
    if (!form.hora) { setMsg({ tipo: "danger", texto: "Seleccioná un horario" }); return; }
    setSaving(true);
    try {
      await api.post("/turnos", { ...form, paciente_id: pacSel?.id || null });
      navigate("/admin");
    } catch(e) {
      setMsg({ tipo: "danger", texto: "Error: " + e.message });
      setSaving(false);
    }
  };

  return (
    <div className="container">
      <button className="back-btn" onClick={() => navigate("/admin")}>← Volver</button>
      <div className="page-title" style={{ marginBottom: 24 }}>Nuevo turno</div>
      {msg && <div className={`alert alert-${msg.tipo}`} style={{ marginBottom: 16 }}>{msg.texto}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div className="card">
          <div className="card-title">Paciente</div>
          {pacSel ? (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "var(--accent-light)", borderRadius: "var(--radius)", border: "1px solid var(--accent-muted)" }}>
              <div>
                <div style={{ fontWeight: 600 }}>{pacSel.apellido}, {pacSel.nombre}</div>
                <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>DNI {pacSel.dni}</div>
              </div>
              <button className="btn-ghost" onClick={() => { setPacSel(null); setBusqueda(""); }}>✕</button>
            </div>
          ) : (
            <>
              <div className="form-group">
                <label>Buscar paciente</label>
                <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Nombre, apellido o DNI..." />
              </div>
              {pacientes.length > 0 && (
                <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius)", overflow: "hidden", marginBottom: 16 }}>
                  {pacientes.map(p => (
                    <div key={p.id} onClick={() => { setPacSel(p); setBusqueda(""); setPacientes([]); }}
                      style={{ padding: "10px 14px", cursor: "pointer", borderBottom: "1px solid var(--border-light)", fontSize: "0.875rem" }}
                      onMouseEnter={e => e.currentTarget.style.background = "var(--surface-2)"}
                      onMouseLeave={e => e.currentTarget.style.background = ""}>
                      <strong>{p.apellido}, {p.nombre}</strong>
                      <span style={{ color: "var(--text-muted)", marginLeft: 8 }}>DNI {p.dni}</span>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: 12, textAlign: "center" }}>— o nuevo paciente externo —</div>
              <div className="form-group"><label>Nombre</label><input value={form.nombre_libre} onChange={e => set("nombre_libre", e.target.value)} /></div>
              <div className="form-row">
                <div className="form-group" style={{ marginBottom: 0 }}><label>Teléfono</label><input value={form.telefono} onChange={e => set("telefono", e.target.value)} /></div>
                <div className="form-group" style={{ marginBottom: 0 }}><label>Email</label><input value={form.email} onChange={e => set("email", e.target.value)} /></div>
              </div>
            </>
          )}
        </div>

        <div className="card">
          <div className="card-title">Fecha y horario</div>
          <div className="form-row">
            <div className="form-group"><label>Fecha</label><input type="date" value={form.fecha} onChange={e => set("fecha", e.target.value)} /></div>
            <div className="form-group">
              <label>Duración</label>
              <select value={form.duracion} onChange={e => set("duracion", Number(e.target.value))}>
                {[15,20,30,45,60,90].map(d => <option key={d} value={d}>{d} min</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label>Horario</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
              {disponibles.length === 0
                ? <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>No hay horarios disponibles</span>
                : disponibles.map(h => (
                    <button key={h} onClick={() => set("hora", h)} style={{
                      padding: "7px 14px", borderRadius: "var(--radius-sm)",
                      border: `1.5px solid ${form.hora === h ? "var(--accent)" : "var(--border)"}`,
                      background: form.hora === h ? "var(--accent)" : "var(--surface)",
                      color: form.hora === h ? "white" : "var(--text)",
                      fontSize: "0.875rem", cursor: "pointer", fontFamily: "var(--font-body)",
                    }}>{h}</button>
                  ))
              }
            </div>
          </div>
          <div className="form-group"><label>Notas</label><textarea rows={2} value={form.notas} onChange={e => set("notas", e.target.value)} /></div>
        </div>
      </div>

      <div style={{ marginTop: 20 }}>
        <button className="btn-primary" onClick={guardar} disabled={saving}>
          {saving ? "Guardando..." : "Agendar turno"}
        </button>
      </div>
    </div>
  );
}
