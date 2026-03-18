import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/api";

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const login = async () => {
    setError(""); setLoading(true);
    try {
      const data = await api.post("/auth/login", form);
      localStorage.setItem("nutri_token", data.token);
      navigate("/admin");
    } catch {
      setError("Usuario o contraseña incorrectos");
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div className="card" style={{ width: "100%", maxWidth: 380 }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontFamily: "var(--font-display, Georgia, serif)", fontSize: "1.8rem", fontWeight: 400 }}>NutriTurnos</div>
          <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: 4 }}>Panel profesional</div>
        </div>

        {error && <div className="alert alert-danger" style={{ marginBottom: 16 }}>{error}</div>}

        <div className="form-group">
          <label>Usuario</label>
          <input value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
            placeholder="admin" onKeyDown={e => e.key === "Enter" && login()} />
        </div>
        <div className="form-group">
          <label>Contraseña</label>
          <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
            placeholder="••••••••" onKeyDown={e => e.key === "Enter" && login()} />
        </div>
        <button className="btn-primary" style={{ width: "100%", marginTop: 8 }} onClick={login} disabled={loading}>
          {loading ? "Ingresando..." : "Ingresar"}
        </button>
      </div>
    </div>
  );
}
