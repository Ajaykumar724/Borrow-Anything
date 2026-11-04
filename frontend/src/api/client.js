const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data;
}

export const api = {
  users: () => request("/users"),
  items: (filters = {}) => {
    const query = new URLSearchParams(Object.entries(filters).filter(([, value]) => value !== "" && value != null));
    return request(`/items${query.size ? `?${query}` : ""}`);
  },
  item: (id) => request(`/items/${id}`),
  createItem: (data) => request("/items", { method: "POST", body: JSON.stringify(data) }),
  rentals: (userId) => request(`/rentals${userId ? `?userId=${encodeURIComponent(userId)}` : ""}`),
  quote: (data) => request("/rentals/quote", { method: "POST", body: JSON.stringify(data) }),
  createRental: (data) => request("/rentals", { method: "POST", body: JSON.stringify(data) }),
  updateRental: (id, status, actorId) => request(`/rentals/${id}/status`, {
    method: "PATCH", body: JSON.stringify({ status, actorId })
  }),
  verifyDemo: (id, method) => request(`/users/${id}/verification-demo`, {
    method: "PATCH", body: JSON.stringify({ method })
  }),
  report: (id, data) => request(`/rentals/${id}/report`, { method: "POST", body: JSON.stringify(data) }),
  disputes: () => request("/rentals/disputes/all")
};
