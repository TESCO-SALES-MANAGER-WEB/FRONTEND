// API client for the Sales Manager backend.
// Shares the same MongoDB as the Coordinator CRM, so leads/quotations/etc. appear in both apps.
// Defaults to the PRODUCTION Sales Manager API. Override with VITE_API_URL for local dev.
const API_BASE = import.meta.env.VITE_API_URL || 'https://api-salesmanager.tescomanagement.com/api';

/* ───────────────────────── session helpers ─────────────────────────
   The Manager app is LOCKED to the "Sales Manager" role. These mirror the
   Coordinator/Head clients so auth state is stored the same way everywhere. */
export const getToken = () => localStorage.getItem('crm_token');

export const setSession = (token, user) => {
  localStorage.setItem('crm_token', token);
  localStorage.setItem('crm_user', JSON.stringify(user || {}));
  localStorage.setItem('crm_authenticated', 'true');
  // Keep the legacy per-manager filtering keys in sync so notifications and
  // manager-scoped views keep working exactly as before.
  try {
    if (user?.name) localStorage.setItem('mgr_name', user.name);
    if (user?.email) localStorage.setItem('mgr_email', user.email);
  } catch { /* ignore */ }
};

export const clearSession = () => {
  ['crm_token', 'crm_user', 'crm_authenticated', 'crm_profile',
   'mgr_name', 'mgr_email', 'mgr_display_name'].forEach((k) => localStorage.removeItem(k));
};

export const getUser = () => {
  try {
    const base = JSON.parse(localStorage.getItem('crm_user') || 'null');
    const override = JSON.parse(localStorage.getItem('crm_profile') || 'null');
    if (!base && !override) return null;
    return { ...(base || {}), ...(override || {}) };
  } catch {
    return null;
  }
};

export async function api(path, { method = 'GET', body, auth = false } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth && getToken()) headers.Authorization = `Bearer ${getToken()}`;

  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error('Cannot reach server. Is the Manager backend running on :5001?');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
}

// Convenience helpers per collection
const resource = (name) => ({
  list: () => api(`/${name}`),
  create: (body) => api(`/${name}`, { method: 'POST', body }),
  bulk: (arr) => api(`/${name}/bulk`, { method: 'POST', body: arr }),
  update: (id, body) => api(`/${name}/${id}`, { method: 'PUT', body }),
  remove: (id) => api(`/${name}/${id}`, { method: 'DELETE' }),
});

export const leadsApi = resource('leads');
export const quotationsApi = resource('quotations');
export const appointmentsApi = resource('appointments');
export const projectsApi = resource('projects');
export const paymentsApi = resource('payments');
export const pipelineApi = resource('pipeline');

// DB-backed, role-scoped notifications. Every call is scoped to the logged-in manager
// (the `mgr_name` captured at login) so a manager only ever sees their own.
const enc = (v) => encodeURIComponent(String(v || '').trim());
export const notificationsApi = {
  getNotifications: (recipient) => api(`/notifications?recipient=${enc(recipient)}`),
  getUnreadCount: (recipient) => api(`/notifications/unread-count?recipient=${enc(recipient)}`),
  markRead: (id, recipient) => api(`/notifications/${id}/read?recipient=${enc(recipient)}`, { method: 'PATCH' }),
  markAllRead: (recipient) => api('/notifications/read-all', { method: 'PATCH', body: { recipient: String(recipient || '').trim() } }),
};
export const measurementsApi = resource('measurements');
export const designsApi = resource('designs');
export const negotiationsApi = resource('negotiations');
export const ordersApi = resource('orders');
export const teamApi = resource('team');

/* ───────────────────────── auth API ─────────────────────────
   This app always logs in as "Sales Manager" — the role is fixed by the caller
   (Login.jsx passes APP_ROLE), never chosen by the user. */
export const authApi = {
  login: (role, email, password) =>
    api('/auth/login', { method: 'POST', body: { role, email, password } }),
  logout: () => api('/auth/logout', { method: 'POST', auth: true }),
  forgotPassword: (email) =>
    api('/auth/forgot-password', { method: 'POST', body: { email } }),
  verifyOtp: (email, otp) =>
    api('/auth/verify-otp', { method: 'POST', body: { email, otp } }),
  resetPassword: (email, otp, newPassword) =>
    api('/auth/reset-password', { method: 'POST', body: { email, otp, newPassword } }),
  me: () => api('/auth/me', { auth: true }),
  updateProfile: ({ name, email }) =>
    api('/auth/profile', { method: 'PATCH', body: { name, email }, auth: true }),
};

export { API_BASE };
