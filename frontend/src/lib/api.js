// Tiny fetch wrapper. The Vite proxy forwards /api/* to the Express backend.

async function request(path, options = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`${res.status} ${res.statusText} — ${text}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  newSession: () => request('/api/session/new'),
  chat: (sessionId, message) =>
    request('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ sessionId, message }),
    }),
  endSession: (sessionId) =>
    request('/api/session/end', {
      method: 'POST',
      body: JSON.stringify({ sessionId }),
    }),
  stats: () => request('/api/stats'),
  health: () => request('/health'),
  reloadDb: () => request('/api/db/reload'),
};
