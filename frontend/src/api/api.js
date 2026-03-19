const API = import.meta.env.VITE_API_URL || "http://localhost:5001";

async function request(path, options = {}) {
  const token = localStorage.getItem("nutri_token");
  const res = await fetch(`${API}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text);
  }
  const ct = res.headers.get("content-type") || "";
  return ct.includes("application/json") ? res.json() : res.text();
}

export const api = {
  get:    (path)        => request(path),
  post:   (path, body)  => request(path, { method: "POST",   body: JSON.stringify(body) }),
  put:    (path, body)  => request(path, { method: "PUT",    body: JSON.stringify(body) }),
  delete: (path)        => request(path, { method: "DELETE" }),
};
