import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../api/api";

const ESTADOS = ["pendiente", "confirmado", "cancelado"];

function estadoColor(estado) {
  if (estado === "confirmado") return { bg: "#e6f2eb", color: "#2d6a4f", border: "#b7d9c6" };
  if (estado === "cancelado")  return { bg: "#fdecea", color: "#b5341a", border: "#f5c6bf" };
  return { bg: "#fff4e0", color: "#c47c00", border: "#f5dfa0" };
}

export default function AdminTurnoDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [turno, setTurno] = useState(null);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    api.get(`/turnos/${id}`).then(setTurno).catch(() => navigate("/admin"));
  }, [id]);

  const cambiarEstado = async (estado) => {
    await api.put(`/turnos/${id}`, { estado });
    setTurno(t => ({ ...t, estado }));
    setMsg({ tipo: "success", texto: `Turno ${estado}` });
    setTimeout(() => setMsg(null), 3000);
  };

  const eliminar = async () => {
    if (!window.confirm("¿Eliminar este turno?")) return;
    await api.delete(`/turnos/${id}`);
    navigate("/admin");
  };

  if (!turno) return <div className="container"><div className="empty-state"><p>Cargando...</p></div></div>;

  const col = estadoColor(turno.estado);

  return (
    <div className="container">
      <button className="back-btn" onClick={() => navigate("/admin")}>← Volver a agenda</button>

      {msg && <div className={`alert alert-${msg.tipo}`} style={{ marginBottom: 16 }}>{msg.texto}</div>}

      <div className="card">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ fontFamily: "var(--font-display, Georgia, serif)", fontSize: "1.5rem", fontWeight: 400 }}>
            {turno.nombre}
          </div>
          <span style={{ fontSize: "0.8rem", fontWeight: 600, padding: "5px 14px", borderRadius: 99, background: col.bg, color: col.color, border: `1px solid ${col.border}` }}>
            {turno.estado}
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
          {[
            { label: "Fecha", value: new Date(turno.fecha + "T00:00:00").toLocaleDateString("es-AR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" }) },
            { label: "Hora", value: `${turno.hora} · ${turno.duracion} min` },
            { label: "Teléfono", value: turno.telefono || "—" },
            { label: "Email", value: turno.email || "—" },
          ].map(({ label, value }) => (
            <div key={label} style={{ background: "var(--surface-2)", borderRadius: 10, padding: "12px 14px", border: "1px solid var(--border-light)" }}>
              <div style={{ fontSize: "0.68rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--text-muted)", marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: "0.95rem", color: "var(--text)" }}>{value}</div>
            </div>
          ))}
        </div>

        {turno.notas && (
          <div style={{ background: "var(--surface-2)", borderRadius: 10, padding: "12px 14px", marginBottom: 20, border: "1px solid var(--border-light)" }}>
            <div style={{ fontSize: "0.68rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--text-muted)", marginBottom: 4 }}>Notas</div>
            <div style={{ fontSize: "0.9rem" }}>{turno.notas}</div>
          </div>
        )}

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {turno.estado === "pendiente" && (
            <button className="btn-success" onClick={() => cambiarEstado("confirmado")}>✓ Confirmar</button>
          )}
          {turno.estado !== "cancelado" && (
            <button className="btn-danger" onClick={() => cambiarEstado("cancelado")}>✕ Cancelar</button>
          )}
          {turno.estado === "cancelado" && (
            <button className="btn-secondary" onClick={() => cambiarEstado("pendiente")}>↩ Reactivar</button>
          )}
          <button className="btn-ghost" onClick={eliminar} style={{ marginLeft: "auto", color: "var(--danger)" }}>🗑️ Eliminar</button>
        </div>
      </div>
    </div>
  );
}
