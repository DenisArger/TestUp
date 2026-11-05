const API_BASE = '/api';
async function apiRequest(url, options = {}) {
  const res = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  const ct = res.headers.get('content-type') || '';
  if (!ct.includes('application/json')) {
    const text = await res.text();
    if (!res.ok) throw new Error(text || `Ошибка ${res.status}`);
    return text;
  }
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || `Ошибка ${res.status}`);
  return data;
}
const apiGet = (u) => apiRequest(u, { method: 'GET' });
const apiPost = (u, b) => apiRequest(u, { method: 'POST', body: JSON.stringify(b) });
window.api = { API_BASE, apiGet, apiPost };
