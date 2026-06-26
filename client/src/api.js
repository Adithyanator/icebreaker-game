const BASE = '/api';

async function request(path, options = {}) {
  const { headers, ...rest } = options;
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...headers },
    ...rest,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Something went wrong');
  }
  return data;
}

export const api = {
  getEvent: () => request('/event'),

  volunteerLogin: (name, centre) =>
    request('/volunteer/login', { method: 'POST', body: JSON.stringify({ name, centre }) }),

  volunteerSelect: (id) =>
    request('/volunteer/select', { method: 'POST', body: JSON.stringify({ id }) }),

  getVolunteer: (id) => request(`/volunteer/${id}`),

  submitCell: (id, data) =>
    request(`/volunteer/${id}/cell`, { method: 'POST', body: JSON.stringify(data) }),

  adminLogin: (password) =>
    request('/admin/login', { method: 'POST', body: JSON.stringify({ password }) }),

  adminRequest: (path, options = {}, password) =>
    request(path, {
      ...options,
      headers: { 'x-admin-password': password, ...options.headers },
    }),

  downloadExport: (format, password) =>
    fetch(`${BASE}/admin/export/${format}`, {
      headers: { 'x-admin-password': password },
    }),

  downloadBackup: (password) =>
    fetch(`${BASE}/admin/backup`, {
      headers: { 'x-admin-password': password },
    }),
};

export function getStoredVolunteer() {
  try {
    const raw = sessionStorage.getItem('volunteer');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStoredVolunteer(volunteer) {
  sessionStorage.setItem('volunteer', JSON.stringify(volunteer));
}

export function clearStoredVolunteer() {
  sessionStorage.removeItem('volunteer');
}
