import { useEffect, useState } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:5001";

const FRASES = [
  // Consejos
  { tipo: "consejo", emoji: "🥦", texto: "Incorporar verduras de distintos colores en cada comida es una de las mejores inversiones para tu salud." },
  { tipo: "consejo", emoji: "💧", texto: "Tomar agua regularmente mejora la digestión, la concentración y el estado de ánimo." },
  { tipo: "consejo", emoji: "🫐", texto: "Los frutos del bosque son ricos en antioxidantes que protegen las células del envejecimiento prematuro." },
  { tipo: "consejo", emoji: "🥑", texto: "Las grasas saludables del palta y el aceite de oliva son esenciales para absorber vitaminas liposolubles." },
  { tipo: "consejo", emoji: "🍎", texto: "Una manzana al día aporta fibra soluble que alimenta la microbiota intestinal." },
  { tipo: "consejo", emoji: "🌾", texto: "Los cereales integrales tienen más fibra y nutrientes que sus versiones refinadas." },
  { tipo: "consejo", emoji: "🐟", texto: "El pescado azul como el salmón aporta omega-3, fundamental para el corazón y el cerebro." },
  { tipo: "consejo", emoji: "🥚", texto: "El huevo es uno de los alimentos más completos: aporta proteínas de alta calidad y vitaminas esenciales." },
  { tipo: "consejo", emoji: "🫘", texto: "Las legumbres como lentejas y garbanzos son fuente de proteína vegetal y fibra prebiótica." },
  { tipo: "consejo", emoji: "🌿", texto: "Incorporar hierbas aromáticas como perejil y cilantro realza el sabor sin necesidad de agregar sal." },
  { tipo: "consejo", emoji: "🍋", texto: "La vitamina C del limón mejora la absorción del hierro de las legumbres y vegetales." },
  { tipo: "consejo", emoji: "🥕", texto: "El betacaroteno de la zanahoria se convierte en vitamina A, importante para la visión y la piel." },
  { tipo: "consejo", emoji: "🫚", texto: "Cocinar con aceite de oliva extra virgen en crudo conserva mejor sus propiedades antioxidantes." },
  { tipo: "consejo", emoji: "🍌", texto: "El potasio del banana ayuda a regular la presión arterial y el funcionamiento muscular." },
  { tipo: "consejo", emoji: "🥗", texto: "Masticar despacio y sin distracciones mejora la digestión y ayuda a reconocer la saciedad." },
  // Datos curiosos
  { tipo: "dato", emoji: "🧠", texto: "¿Sabías? El intestino tiene más de 100 millones de neuronas — por eso lo llaman el 'segundo cerebro'." },
  { tipo: "dato", emoji: "🍫", texto: "¿Sabías? El cacao puro es uno de los alimentos con mayor concentración de magnesio en la naturaleza." },
  { tipo: "dato", emoji: "🌶️", texto: "¿Sabías? La capsaicina del ají activa los mismos receptores de calor que la temperatura alta, por eso 'quema'." },
  { tipo: "dato", emoji: "🫙", texto: "¿Sabías? El yogur natural contiene bacterias vivas que pueden colonizar el intestino y mejorar la digestión." },
  { tipo: "dato", emoji: "🥜", texto: "¿Sabías? Los frutos secos como almendras y nueces reducen el colesterol LDL cuando se consumen regularmente." },
  { tipo: "dato", emoji: "🍯", texto: "¿Sabías? La miel pura nunca caduca — se encontraron jarras de 3000 años en pirámides egipcias todavía comestibles." },
  { tipo: "dato", emoji: "🌽", texto: "¿Sabías? El maíz morado contiene antocianinas, pigmentos con potente efecto antiinflamatorio." },
  { tipo: "dato", emoji: "🫀", texto: "¿Sabías? Una dieta rica en potasio puede reducir el riesgo de accidente cerebrovascular hasta un 21%." },
  { tipo: "dato", emoji: "🥬", texto: "¿Sabías? La espinaca cocida tiene más hierro biodisponible que la cruda porque el calor desactiva el ácido oxálico." },
  { tipo: "dato", emoji: "🍵", texto: "¿Sabías? El té verde contiene L-teanina, un aminoácido que mejora la concentración sin generar ansiedad." },
  { tipo: "dato", emoji: "🫁", texto: "¿Sabías? El rábano picante contiene más vitamina C que la naranja, aunque se consume en cantidades pequeñas." },
  { tipo: "dato", emoji: "🌊", texto: "¿Sabías? Las algas marinas como el nori son de los pocos alimentos vegetales con vitamina B12 biodisponible." },
  { tipo: "dato", emoji: "🍇", texto: "¿Sabías? El resveratrol de la piel de la uva negra tiene propiedades cardioprotectoras estudiadas por la ciencia." },
  { tipo: "dato", emoji: "🥩", texto: "¿Sabías? El hígado vacuno tiene 10 veces más hierro que la carne roja muscular." },
  { tipo: "dato", emoji: "🌰", texto: "¿Sabías? La castaña es el único fruto seco bajo en grasa y con alto contenido de almidón, similar a los cereales." },
];

const MESES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
const DIAS  = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];

function toISO(d) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }
function addDays(d,n) { const dt = new Date(d); dt.setDate(dt.getDate()+n); return dt; }

export default function Reservar() {
  const [modo, setModo]       = useState("inicio"); // inicio | reservar | cancelar
  const [paso, setPaso]       = useState(1);
  const [fecha, setFecha]     = useState(null);
  const [hora, setHora]       = useState("");
  const [duracion, setDuracion] = useState(45);
  const [disponibles, setDisponibles] = useState([]);
  const [feriado, setFeriado] = useState(null);
  const [frase, setFrase] = useState(null);
  const [form, setForm]       = useState({ nombre_libre: "", telefono: "", email: "", notas: "" });
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState("");
  const [profNombre, setProfNombre] = useState("");

  // Cancelar
  const [nombreCancelar, setNombreCancelar] = useState("");
  const [turnosCancelar, setTurnosCancelar] = useState([]);
  const [buscando, setBuscando]             = useState(false);
  const [cancelMsg, setCancelMsg]           = useState("");

  const diasHabiles = [];
  let d = new Date(); // empieza desde hoy
  while (diasHabiles.length < 14) {
    if (d.getDay() >= 1 && d.getDay() <= 5) diasHabiles.push(new Date(d));
    d = addDays(d, 1);
  }

  useEffect(() => {
    fetch(`${API}/publico/configuracion`)
      .then(r => r.json())
      .then(data => {
        setProfNombre(data.prof_nombre || "");
        if (data.agenda_duracion_default) setDuracion(Number(data.agenda_duracion_default));
      }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!fecha) return;
    setFeriado(null);
    fetch(`${API}/publico/disponibles?fecha=${toISO(fecha)}&duracion=${duracion}`)
      .then(r => r.json()).then(d => {
        if (d.feriado) {
          setFeriado(d.descripcion || "Feriado");
          setDisponibles([]);
        } else {
          setDisponibles(d.disponibles || []);
        }
      }).catch(() => {});
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

  const buscarTurnos = async () => {
    if (!nombreCancelar.trim()) return;
    setBuscando(true); setCancelMsg("");
    try {
      const res = await fetch(`${API}/publico/mis-turnos?nombre=${encodeURIComponent(nombreCancelar.trim())}`);
      const data = await res.json();
      setTurnosCancelar(data);
      if (data.length === 0) setCancelMsg("No se encontraron turnos activos con ese nombre.");
    } catch { setCancelMsg("Error al buscar. Intentá de nuevo."); }
    setBuscando(false);
  };

  const cancelarTurno = async (id) => {
    if (!window.confirm("¿Cancelar este turno?")) return;
    try {
      const res = await fetch(`${API}/publico/cancelar/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: nombreCancelar.trim() }),
      });
      if (!res.ok) throw new Error();
      setTurnosCancelar(t => t.filter(x => x.id !== id));
      setCancelMsg("Turno cancelado correctamente.");
    } catch { setCancelMsg("No se pudo cancelar."); }
  };

  // ── Pantalla de inicio ──
  if (modo === "inicio") return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 16px" }}>
      <div style={{ textAlign: "center", marginBottom: 40 }}>
        <div style={{ fontFamily: "var(--font-display, Georgia, serif)", fontSize: "2.4rem", fontWeight: 400, color: "var(--text)" }}>NutriTurnos</div>
        {profNombre && <div style={{ fontSize: "0.95rem", color: "var(--text-muted)", marginTop: 8 }}>{profNombre}</div>}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%", maxWidth: 340 }}>
        <button className="btn-primary" style={{ padding: "14px 20px", fontSize: "1rem" }} onClick={() => setModo("reservar")}>
          📅 Reservar turno
        </button>
        <button className="btn-secondary" style={{ padding: "14px 20px", fontSize: "1rem" }} onClick={() => setModo("cancelar")}>
          ❌ Cancelar mi turno
        </button>
      </div>
    </div>
  );

  // ── Pantalla cancelar ──
  if (modo === "cancelar") return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start", padding: "40px 16px" }}>
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <div style={{ fontFamily: "var(--font-display, Georgia, serif)", fontSize: "2rem", fontWeight: 400 }}>Cancelar turno</div>
        <div style={{ fontSize: "0.875rem", color: "var(--text-muted)", marginTop: 6 }}>Ingresá tu nombre y apellido tal como lo registraste</div>
      </div>

      <div className="card" style={{ width: "100%", maxWidth: 480 }}>
        <div className="form-group">
          <label>Nombre y apellido</label>
          <input
            value={nombreCancelar}
            onChange={e => setNombreCancelar(e.target.value)}
            placeholder="ej: Juan Pérez"
            onKeyDown={e => e.key === "Enter" && buscarTurnos()}
          />
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn-primary" onClick={buscarTurnos} disabled={buscando}>
            {buscando ? "Buscando..." : "Buscar mis turnos"}
          </button>
          <button className="btn-ghost" onClick={() => { setModo("inicio"); setTurnosCancelar([]); setNombreCancelar(""); setCancelMsg(""); }}>
            ← Volver
          </button>
        </div>

        {cancelMsg && (
          <div className={`alert ${cancelMsg.includes("correctamente") ? "alert-success" : "alert-danger"}`} style={{ marginTop: 16 }}>
            {cancelMsg}
          </div>
        )}

        {turnosCancelar.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <div style={{ fontSize: "0.8rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: 12 }}>
              Tus turnos activos
            </div>
            {turnosCancelar.map(t => (
              <div key={t.id} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "12px 14px", borderRadius: "var(--radius)", border: "1px solid var(--border-light)",
                background: "var(--surface-2)", marginBottom: 10,
              }}>
                <div>
                  <div style={{ fontWeight: 600 }}>
                    {new Date(t.fecha + "T00:00:00").toLocaleDateString("es-AR", { weekday: "long", day: "2-digit", month: "long" })}
                  </div>
                  <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                    {t.hora} · {t.duracion} min · <span style={{ color: t.estado === "confirmado" ? "#1a6630" : "#c47c00", fontWeight: 500 }}>{t.estado}</span>
                  </div>
                </div>
                <button className="btn-danger" style={{ padding: "6px 12px", fontSize: "0.8rem" }} onClick={() => cancelarTurno(t.id)}>
                  Cancelar
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // ── Pantalla reservar ──
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start", padding: "40px 16px" }}>
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <div style={{ fontFamily: "var(--font-display, Georgia, serif)", fontSize: "2.2rem", fontWeight: 400, color: "var(--text)" }}>
          Reservá tu turno
        </div>
        {profNombre && <div style={{ fontSize: "0.9rem", color: "var(--text-muted)", marginTop: 6 }}>{profNombre}</div>}
      </div>

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
        {paso === 1 && (
          <>
            <div className="card-title">¿Qué día preferís?</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: 8, marginBottom: 24 }}>
              {diasHabiles.map((dia, i) => {
                const sel = fecha && toISO(dia) === toISO(fecha);
                return (
                  <button key={i} onClick={() => { setFecha(dia); setHora(""); setFrase(FRASES[Math.floor(Math.random() * FRASES.length)]); }} style={{
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
                {frase && (
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 14px", background: frase.tipo === "dato" ? "#f0f4ff" : "var(--accent-light, #e8f5ee)", borderRadius: "var(--radius)", marginBottom: 20, border: `1px solid ${frase.tipo === "dato" ? "#c8d6f5" : "var(--border-light)"}` }}>
                    <span style={{ fontSize: "1.6rem", lineHeight: 1 }}>{frase.emoji}</span>
                    <div>
                      <div style={{ fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: frase.tipo === "dato" ? "#4a6fa5" : "var(--accent)", marginBottom: 3 }}>
                        {frase.tipo === "dato" ? "Dato curioso" : "Consejo saludable"}
                      </div>
                      <p style={{ fontSize: "0.82rem", color: "var(--text)", margin: 0, lineHeight: 1.5 }}>{frase.texto}</p>
                    </div>
                  </div>
                )}
                <div className="card-title">Horarios disponibles</div>
                {feriado ? (
                  <div style={{ background: "#fff4e0", border: "1px solid #f5dfa0", borderRadius: "var(--radius)", padding: "14px 16px", marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: "1.4rem" }}>🎉</span>
                    <div>
                      <div style={{ fontWeight: 600, color: "#c47c00", fontSize: "0.9rem" }}>{feriado}</div>
                      <div style={{ fontSize: "0.82rem", color: "#7d5a00", marginTop: 2 }}>Nos adherimos al feriado. Por favor seleccioná otro día.</div>
                    </div>
                  </div>
                ) : disponibles.length === 0
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
                <div style={{ display: "flex", gap: 10 }}>
                  <button className="btn-primary" disabled={!hora} onClick={() => setPaso(2)}>Continuar →</button>
                  <button className="btn-ghost" onClick={() => setModo("inicio")}>← Volver</button>
                </div>
              </>
            )}
            {!fecha && <button className="btn-ghost" onClick={() => setModo("inicio")}>← Volver</button>}
          </>
        )}

        {paso === 2 && (
          <>
            <div className="card-title">Tus datos</div>
            <div style={{ padding: "10px 14px", background: "var(--accent-light)", borderRadius: "var(--radius)", marginBottom: 20, fontSize: "0.875rem", color: "var(--accent-dark, #1b4332)" }}>
              📅 {fecha && `${fecha.getDate()} de ${MESES[fecha.getMonth()]}`} a las {hora}
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

        {paso === 3 && (
          <div style={{ textAlign: "center", padding: "32px 0" }}>
            <div style={{ fontSize: "3.5rem", marginBottom: 16 }}>✅</div>
            <div style={{ fontFamily: "var(--font-display, Georgia, serif)", fontSize: "1.6rem", marginBottom: 8 }}>¡Turno reservado!</div>
            <div style={{ color: "var(--text-muted)", marginBottom: 4 }}>{fecha && `${fecha.getDate()} de ${MESES[fecha.getMonth()]}`} a las {hora}</div>
            <div style={{ color: "var(--text-muted)", fontSize: "0.875rem", marginTop: 8 }}>Te vamos a contactar para confirmarlo.</div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 24 }}>
              <button className="btn-secondary" onClick={() => { setPaso(1); setFecha(null); setHora(""); setForm({ nombre_libre: "", telefono: "", email: "", notas: "" }); }}>
                Reservar otro turno
              </button>
              <button className="btn-ghost" onClick={() => setModo("inicio")}>Inicio</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
