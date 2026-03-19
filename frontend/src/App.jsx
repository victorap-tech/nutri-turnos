import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AdminHeader from "./components/AdminHeader";
import Login from "./pages/Login";
import AdminAgenda from "./pages/AdminAgenda";
import AdminNuevoTurno from "./pages/AdminNuevoTurno";
import AdminConfig from "./pages/AdminConfig";
import AdminDisponibilidad from "./pages/AdminDisponibilidad";
import Reservar from "./pages/Reservar";

function PrivateRoute({ children }) {
  return localStorage.getItem("nutri_token") ? children : <Navigate to="/login" />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Reservar />} />
        <Route path="/login" element={<Login />} />
        <Route path="/admin/*" element={
          <PrivateRoute>
            <AdminHeader />
            <Routes>
              <Route index element={<AdminAgenda />} />
              <Route path="nuevo" element={<AdminNuevoTurno />} />
              <Route path="disponibilidad" element={<AdminDisponibilidad />} />
              <Route path="config" element={<AdminConfig />} />
            </Routes>
          </PrivateRoute>
        } />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}
